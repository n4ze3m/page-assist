import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQuery
} from "@tanstack/react-query"
import {
  Empty,
  Skeleton,
  Dropdown,
  Menu,
  Tooltip,
  Input,
  message,
  Button
} from "antd"
import { SaveButton } from "@/components/Common/SaveButton"
import {
  PencilIcon,
  Trash2,
  MoreVertical,
  PinIcon,
  PinOffIcon,
  BotIcon,
  SearchIcon,
  Trash2Icon,
  Loader2,
  ChevronDown,
  GitBranch,
  Sparkles,
  FolderPlus,
  Folder
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { lastUsedChatModelEnabled } from "@/services/model-settings"
import { useDebounce } from "@/hooks/useDebounce"
import { useState } from "react"
import { PageAssistDatabase } from "@/db/dexie/chat"
import {
  deleteByHistoryId,
  deleteHistoriesByDateRange,
  formatToChatHistory,
  updateHistory,
  pinHistory,
  formatToMessage,
  getSessionFiles,
  getPromptById,
  getProjectFolders,
  addProjectFolder,
  updateProjectFolder,
  deleteProjectFolder,
  assignHistoryToFolder
} from "@/db/dexie/helpers"
import { UploadedFile } from "@/db/dexie/types"
import { isDatabaseClosedError } from "@/utils/ff-error"
import { updatePageTitle } from "@/utils/update-page-title"
import { generateTitle } from "@/services/title"

type Props = {
  onClose: () => void
  setMessages: (messages: any) => void
  setHistory: (history: any) => void
  setHistoryId: (historyId: string) => void
  setSelectedModel: (model: string) => void
  setSelectedSystemPrompt: (prompt: string) => void
  setSystemPrompt: (prompt: string) => void
  setContext?: (context: UploadedFile[]) => void
  clearChat: () => void
  temporaryChat: boolean
  historyId: string
  history: any
  isOpen: boolean
  selectedModel: string
}

export const Sidebar = ({
  onClose,
  setMessages,
  setHistory,
  setHistoryId,
  setSelectedModel,
  setSelectedSystemPrompt,
  clearChat,
  historyId,
  setSystemPrompt,
  temporaryChat,
  isOpen,
  setContext,
  selectedModel
}: Props) => {
  const { t } = useTranslation(["option", "common"])
  const client = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [deleteGroup, setDeleteGroup] = useState<string | null>(null)
  const [dexiePrivateWindowError, setDexiePrivateWindowError] = useState(false)
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [generatingTitleId, setGeneratingTitleId] = useState<string | null>(
    null
  )
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editProjectTitle, setEditProjectTitle] = useState("")
  const [draggingChatId, setDraggingChatId] = useState<string | null>(null)
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(
    null
  )
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set()
  )

  // Helper function to group chats by date
  const groupChatsByDate = (chats: any[]) => {
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const todayItems = chats.filter(
      (item) => new Date(item?.createdAt) >= today
    )
    const yesterdayItems = chats.filter(
      (item) =>
        new Date(item?.createdAt) >= yesterday &&
        new Date(item?.createdAt) < today
    )
    const lastWeekItems = chats.filter(
      (item) =>
        new Date(item?.createdAt) >= lastWeek &&
        new Date(item?.createdAt) < yesterday
    )
    const olderItems = chats.filter(
      (item) => new Date(item?.createdAt) < lastWeek
    )

    const groups = []
    if (todayItems.length) groups.push({ label: "today", items: todayItems })
    if (yesterdayItems.length)
      groups.push({ label: "yesterday", items: yesterdayItems })
    if (lastWeekItems.length)
      groups.push({ label: "last7Days", items: lastWeekItems })
    if (olderItems.length) groups.push({ label: "older", items: olderItems })

    return groups
  }

  const handleEditStart = (chat: any) => {
    setEditingHistoryId(chat.id)
    setEditTitle(chat.title)
  }

  const handleEditCancel = () => {
    setEditingHistoryId(null)
    setEditTitle("")
  }

  const handleGenerateTitle = async (chat: any) => {
    setGeneratingTitleId(chat.id)
    try {
      const db = new PageAssistDatabase()
      const history = await db.getChatHistory(chat.id)
      const historyDetails = await db.getHistoryInfo(chat.id)
      const chatHistory = formatToChatHistory(history)
      const model = selectedModel

      const generatedTitle = await generateTitle(model, chatHistory, chat.title)
      if (generatedTitle && generatedTitle !== chat.title) {
        setEditTitle(generatedTitle)
      }
    } catch (error) {
      console.error("Error generating title:", error)
      message.error(
        t("common:generateTitleError", {
          defaultValue: "Failed to generate title"
        })
      )
    } finally {
      setGeneratingTitleId(null)
    }
  }

  const handleEditSave = (id: string, currentTitle: string) => {
    if (editTitle.trim() && editTitle.trim() !== currentTitle) {
      editHistory({ id, title: editTitle.trim() })
    }
    setEditingHistoryId(null)
    setEditTitle("")
  }

  // Using infinite query for pagination
  const {
    data: chatHistoriesData,
    status,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ["fetchChatHistory", debouncedSearchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const db = new PageAssistDatabase()
        const result = await db.getChatHistoriesPaginated(
          pageParam,
          debouncedSearchQuery || undefined
        )

        // If searching, don't group by date - just return all results in a single group
        if (debouncedSearchQuery) {
          console.log("Search results:", result.histories)
          return {
            groups:
              result.histories.length > 0
                ? [{ label: "searchResults", items: result.histories }]
                : [],
            hasMore: result.hasMore,
            totalCount: result.totalCount
          }
        }

        // Group the histories by date only when not searching
        const now = new Date()
        const today = new Date(now.setHours(0, 0, 0, 0))
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)

        const pinnedItems = result.histories.filter((item) => item.is_pinned)
        const todayItems = result.histories.filter(
          (item) => !item.is_pinned && new Date(item?.createdAt) >= today
        )
        const yesterdayItems = result.histories.filter(
          (item) =>
            !item.is_pinned &&
            new Date(item?.createdAt) >= yesterday &&
            new Date(item?.createdAt) < today
        )
        const lastWeekItems = result.histories.filter(
          (item) =>
            !item.is_pinned &&
            new Date(item?.createdAt) >= lastWeek &&
            new Date(item?.createdAt) < yesterday
        )
        const olderItems = result.histories.filter(
          (item) => !item.is_pinned && new Date(item?.createdAt) < lastWeek
        )

        const groups = []

        // Always get all pinned items for the first page to ensure they appear at the top
        if (pageParam === 1) {
          try {
            const db = new PageAssistDatabase()
            const allPinnedItems = await db.getChatHistories()
            const pinnedOnlyItems = allPinnedItems.filter(
              (item) => item.is_pinned
            )
            if (pinnedOnlyItems.length > 0) {
              groups.push({ label: "pinned", items: pinnedOnlyItems })
            }
          } catch (e) {
            // Fallback to pinned items from current page if db query fails
            if (pinnedItems.length)
              groups.push({ label: "pinned", items: pinnedItems })
          }
        }

        if (todayItems.length)
          groups.push({ label: "today", items: todayItems })
        if (yesterdayItems.length)
          groups.push({ label: "yesterday", items: yesterdayItems })
        if (lastWeekItems.length)
          groups.push({ label: "last7Days", items: lastWeekItems })
        if (olderItems.length)
          groups.push({ label: "older", items: olderItems })

        return {
          groups,
          hasMore: result.hasMore,
          totalCount: result.totalCount
        }
      } catch (e) {
        setDexiePrivateWindowError(isDatabaseClosedError(e))
        return {
          groups: [],
          hasMore: false,
          totalCount: 0
        }
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined
    },
    placeholderData: undefined,
    enabled: isOpen,
    initialPageParam: 1
  })

  // Flatten all groups from all pages
  const chatHistories =
    chatHistoriesData?.pages.reduce(
      (acc, page) => {
        page.groups.forEach((group) => {
          const existingGroup = acc.find((g) => g.label === group.label)
          if (existingGroup) {
            const newItems = group.items.filter(
              (newItem) =>
                !existingGroup.items.some(
                  (existingItem) => existingItem.id === newItem.id
                )
            )
            existingGroup.items.push(...newItems)
          } else {
            acc.push({ ...group })
          }
        })
        return acc
      },
      [] as Array<{ label: string; items: any[] }>
    ) || []

  const orderedChatHistories = chatHistories.sort((a, b) => {
    const order = [
      "pinned",
      "today",
      "yesterday",
      "last7Days",
      "older",
      "searchResults"
    ]
    return order.indexOf(a.label) - order.indexOf(b.label)
  })

  const { mutate: deleteHistory } = useMutation({
    mutationKey: ["deleteHistory"],
    mutationFn: deleteByHistoryId,
    onSuccess: (history_id) => {
      client.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
      if (historyId === history_id) {
        clearChat()
        updatePageTitle()
      }
    }
  })

  const { mutate: editHistory } = useMutation({
    mutationKey: ["editHistory"],
    mutationFn: async (data: { id: string; title: string }) => {
      return await updateHistory(data.id, data.title)
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
    }
  })

  const { mutate: deleteHistoriesByRange, isPending: deleteRangeLoading } =
    useMutation({
      mutationKey: ["deleteHistoriesByRange"],
      mutationFn: async (rangeLabel: string) => {
        setDeleteGroup(rangeLabel)
        return await deleteHistoriesByDateRange(rangeLabel)
      },
      onSuccess: (deletedIds) => {
        client.invalidateQueries({
          queryKey: ["fetchChatHistory"]
        })

        if (deletedIds.includes(historyId)) {
          clearChat()
        }

        message.success(
          t("common:historiesDeleted", { count: deletedIds.length })
        )
      },
      onError: (error) => {
        console.error("Failed to delete histories:", error)
        message.error(t("common:deleteHistoriesError"))
      }
    })

  const handleDeleteHistoriesByRange = (rangeLabel: string) => {
    if (!confirm(t(`common:range:deleteConfirm:${rangeLabel}`))) {
      return
    }
    deleteHistoriesByRange(rangeLabel)
  }

  const { mutate: pinChatHistory, isPending: pinLoading } = useMutation({
    mutationKey: ["pinHistory"],
    mutationFn: async (data: { id: string; is_pinned: boolean }) => {
      return await pinHistory(data.id, data.is_pinned)
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
    }
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const { data: projectFoldersData = [] } = useQuery({
    queryKey: ["fetchProjectFolders"],
    queryFn: async () => {
      return await getProjectFolders()
    },
    enabled: isOpen
  })

  const projectFolders = projectFoldersData || []

  const { mutate: createProjectFolder, isPending: creatingProject } =
    useMutation({
      mutationKey: ["createProjectFolder"],
      mutationFn: async (data: { title: string }) => {
        return await addProjectFolder(data.title)
      },
      onSuccess: () => {
        client.invalidateQueries({ queryKey: ["fetchProjectFolders"] })
        setNewProjectTitle("")
        setIsCreatingProject(false)
      }
    })

  const { mutate: renameProjectFolder } = useMutation({
    mutationKey: ["renameProjectFolder"],
    mutationFn: async (data: { id: string; title: string }) => {
      return await updateProjectFolder(data.id, data.title)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fetchProjectFolders"] })
      setEditingProjectId(null)
      setEditProjectTitle("")
    }
  })

  const { mutate: removeProjectFolder } = useMutation({
    mutationKey: ["deleteProjectFolder"],
    mutationFn: async (id: string) => {
      return await deleteProjectFolder(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fetchProjectFolders"] })
      client.invalidateQueries({ queryKey: ["fetchChatHistory"] })
    }
  })

  const { mutate: moveChatToFolder } = useMutation({
    mutationKey: ["assignHistoryToFolder"],
    mutationFn: async (data: { historyId: string; folderId?: string }) => {
      return await assignHistoryToFolder(data.historyId, data.folderId)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fetchChatHistory"] })
    }
  })

  const startProjectEdit = (project: { id: string; title: string }) => {
    setEditingProjectId(project.id)
    setEditProjectTitle(project.title)
  }

  const cancelProjectEdit = () => {
    setEditingProjectId(null)
    setEditProjectTitle("")
  }

  const saveProjectEdit = (projectId: string, currentTitle: string) => {
    const trimmedTitle = editProjectTitle.trim()
    if (trimmedTitle && trimmedTitle !== currentTitle) {
      renameProjectFolder({ id: projectId, title: trimmedTitle })
    } else {
      cancelProjectEdit()
    }
  }

  const handleCreateProject = () => {
    const trimmedTitle = newProjectTitle.trim()
    if (!trimmedTitle) {
      return
    }
    createProjectFolder({ title: trimmedTitle })
  }

  const handleDeleteProject = (projectId: string) => {
    if (
      !confirm(
        t("common:deleteProjectConfirmation", {
          defaultValue:
            "Delete this project folder? Chats will move back to Your chats."
        })
      )
    ) {
      return
    }
    removeProjectFolder(projectId)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const folderMap = projectFolders.reduce<Record<string, any>>(
    (acc, folder) => {
      acc[folder.id] = folder
      return acc
    },
    {}
  )

  const isSearchActive = Boolean(debouncedSearchQuery)
  const allChats = orderedChatHistories.flatMap((group) => group.items)

  // Separate pinned chats from the rest
  const pinnedChats = allChats.filter((chat) => chat.is_pinned)
  const unpinnedChats = allChats.filter((chat) => !chat.is_pinned)

  const projectChatsMap = unpinnedChats.reduce<Record<string, any[]>>(
    (acc, chat) => {
      if (!chat.folder_id) {
        return acc
      }
      if (!acc[chat.folder_id]) {
        acc[chat.folder_id] = []
      }
      acc[chat.folder_id].push(chat)
      return acc
    },
    {}
  )

  const unassignedChats = unpinnedChats.filter((chat) => !chat.folder_id)

  const handleDragStart = (chatId: string) => {
    setDraggingChatId(chatId)
  }

  const handleDragEnd = () => {
    setDraggingChatId(null)
    setDragOverProjectId(null)
  }

  const handleDropOnFolder = (folderId?: string) => {
    if (!draggingChatId) {
      return
    }
    moveChatToFolder({ historyId: draggingChatId, folderId })
    handleDragEnd()
  }

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const renderChatRow = (chat: any) => {
    return (
      <div
        key={chat.id}
        draggable
        onDragStart={() => handleDragStart(chat.id)}
        onDragEnd={handleDragEnd}
        className={`flex py-2 px-2 items-center gap-3 relative rounded-md truncate hover:pr-4 group transition-opacity duration-300 ease-in-out border ${
          historyId === chat.id
            ? "bg-gray-200 dark:bg-[#454242] border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            : "bg-gray-50 dark:bg-[#242424] dark:text-gray-100 text-gray-800 border-gray-300 dark:border-[#404040] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]"
        }`}
        data-chat-id={chat.id}>
        {chat?.message_source === "copilot" && (
          <BotIcon className="size-3 text-gray-500 dark:text-gray-400" />
        )}
        {chat?.message_source === "branch" && (
          <GitBranch className="size-3 text-gray-500 dark:text-gray-400" />
        )}
        {editingHistoryId === chat.id ? (
          <div className="flex items-center flex-1 gap-1">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditSave(chat.id, chat.title)
                } else if (e.key === "Escape") {
                  handleEditCancel()
                }
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                if (e.relatedTarget?.closest("[data-generate-btn]")) {
                  return
                }
                handleEditSave(chat.id, chat.title)
              }}
              autoFocus
              disabled={generatingTitleId === chat.id}
              className={`flex-1 h-8 text-sm z-20 px-0 bg-transparent outline-none border-none dark:focus:ring-[#404040] focus:ring-gray-300 focus:rounded-md focus:p-2 caret-current selection:bg-gray-300 dark:selection:bg-gray-600 ${
                historyId === chat.id
                  ? "text-gray-900 dark:text-gray-100 placeholder-gray-500"
                  : "text-gray-800 dark:text-gray-100 placeholder-gray-400"
              } ${generatingTitleId === chat.id ? "opacity-50" : ""}`}
            />
            <Tooltip
              title={t("common:generateTitle", {
                defaultValue: "Generate title with AI"
              })}>
              <button
                data-generate-btn
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateTitle(chat)
                }}
                disabled={generatingTitleId === chat.id}
                className={`p-1 rounded-md transition-all duration-200 ${
                  generatingTitleId === chat.id
                    ? "text-purple-500 dark:text-purple-400"
                    : "text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}>
                <Sparkles
                  className={`w-4 h-4 ${
                    generatingTitleId === chat.id ? "animate-pulse" : ""
                  }`}
                  style={
                    generatingTitleId === chat.id
                      ? {
                          filter: "drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))"
                        }
                      : undefined
                  }
                />
              </button>
            </Tooltip>
          </div>
        ) : (
          <button
            className="flex-1 overflow-hidden break-all text-start truncate w-full"
            onClick={async () => {
              const db = new PageAssistDatabase()
              const history = await db.getChatHistory(chat.id)
              const historyDetails = await db.getHistoryInfo(chat.id)
              setHistoryId(chat.id)
              setHistory(formatToChatHistory(history))
              setMessages(formatToMessage(history))
              const isLastUsedChatModel = await lastUsedChatModelEnabled()
              if (isLastUsedChatModel) {
                const currentChatModel = historyDetails?.model_id
                if (currentChatModel) {
                  setSelectedModel(currentChatModel)
                }
              }
              const lastUsedPrompt = historyDetails?.last_used_prompt
              if (lastUsedPrompt) {
                if (lastUsedPrompt.prompt_id) {
                  const prompt = await getPromptById(lastUsedPrompt.prompt_id)
                  if (prompt) {
                    setSelectedSystemPrompt(lastUsedPrompt.prompt_id)
                  }
                }
                setSystemPrompt(lastUsedPrompt.prompt_content)
              }

              if (setContext) {
                const session = await getSessionFiles(chat.id)
                setContext(session)
              }
              updatePageTitle(chat.title)
              navigate("/")
              onClose()
            }}>
            <span className="flex-grow truncate">{chat.title}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key="pin"
                  icon={
                    chat.is_pinned ? (
                      <PinOffIcon className="w-4 h-4" />
                    ) : (
                      <PinIcon className="w-4 h-4" />
                    )
                  }
                  onClick={() =>
                    pinChatHistory({
                      id: chat.id,
                      is_pinned: !chat.is_pinned
                    })
                  }
                  disabled={pinLoading}>
                  {chat.is_pinned ? t("common:unpin") : t("common:pin")}
                </Menu.Item>
                <Menu.Item
                  key="edit"
                  icon={<PencilIcon className="w-4 h-4" />}
                  onClick={(e) => {
                    e.domEvent.stopPropagation()
                    handleEditStart(chat)
                  }}>
                  {t("common:edit")}
                </Menu.Item>
                <Menu.Item
                  key="delete"
                  icon={<Trash2 className="w-4 h-4" />}
                  danger
                  onClick={() => {
                    if (!confirm(t("deleteHistoryConfirmation"))) return
                    deleteHistory(chat.id)
                  }}>
                  {t("common:delete")}
                </Menu.Item>
              </Menu>
            }
            trigger={["click"]}
            placement="bottomRight">
            <button className="text-gray-500 dark:text-gray-400 opacity-80 hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </button>
          </Dropdown>
        </div>
      </div>
    )
  }

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return (
    <div
      className={`overflow-y-auto z-99 ${temporaryChat ? "pointer-events-none opacity-50" : ""}`}>
      <div className="sticky top-0 z-10 my-3">
        <div className="relative">
          <Input
            placeholder={t("common:search")}
            value={searchQuery}
            onChange={handleSearchChange}
            prefix={<SearchIcon className="w-4 h-4 text-gray-400" />}
            suffix={
              searchQuery ? (
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  ✕
                </button>
              ) : null
            }
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-[#232222]"
          />
        </div>
      </div>

      {status === "success" &&
        orderedChatHistories.length === 0 &&
        !dexiePrivateWindowError && (
          <div className="flex justify-center items-center mt-20 overflow-hidden">
            <Empty description={t("common:noHistory")} />
          </div>
        )}

      {dexiePrivateWindowError && (
        <div className="flex justify-center items-center mt-20 overflow-hidden">
          <Empty
            description={t("common:privateWindow", {
              defaultValue:
                "Don't worry, this is a known issue on Firefox: IndexedDB does not work in private mode. Please open the extension in a normal window to view your chat history."
            })}
          />
        </div>
      )}

      {(status === "pending" || isLoading) && (
        <div className="flex justify-center items-center mt-5">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      )}

      {status === "error" && (
        <div className="flex justify-center items-center">
          <span className="text-red-500">Error loading history</span>
        </div>
      )}

      {status === "success" && orderedChatHistories.length > 0 && (
        <div className="flex flex-col gap-2">
         
          {/* Pinned Chats Section - Always show at top when not searching */}
          {!isSearchActive && pinnedChats.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="px-2 text-sm font-medium text-gray-500">
                  {t("common:date:pinned")}
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {pinnedChats.map((chat) => renderChatRow(chat))}
              </div>
            </div>
          )}

          {/* Project Folders Section */}
          {!isSearchActive && (
            <>
             <div className="flex items-center justify-between">
                <h3 className="px-2 text-sm font-medium text-gray-500">
                  {t("common:projects", { defaultValue: "Projects" })}
                </h3>
              </div>

               {isCreatingProject ? (
            <div className="rounded-md p-2 mb-2 bg-gray-100 dark:bg-[#2a2a2a] border border-gray-400 dark:border-[#383838]">
              <div className="flex flex-col gap-2">
                <input
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateProject()
                    } else if (e.key === "Escape") {
                      setIsCreatingProject(false)
                      setNewProjectTitle("")
                    }
                  }}
                  placeholder={t("common:projectName", {
                    defaultValue: "Project name"
                  })}
                  autoFocus
                  className="px-2 py-1 text-sm bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <SaveButton
                    onClick={handleCreateProject}
                    disabled={creatingProject || !newProjectTitle.trim()}
                    text="create"
                    textOnSave="created"
                    className="mt-0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingProject(true)}
              className="flex items-center gap-2 px-2 py-2 mb-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-colors w-full border border-transparent hover:border-gray-300 dark:hover:border-[#404040]">
              <FolderPlus className="w-4 h-4" />
              {t("common:newProject", { defaultValue: "New project" })}
            </button>
          )}
              {/* Project Folders */}
              {projectFolders.map((folder) => {
                const folderChats = projectChatsMap[folder.id] || []
                const isCollapsed = !collapsedFolders.has(folder.id)
                const groupedFolderChats = groupChatsByDate(folderChats)
                return (
                  <div
                    key={folder.id}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverProjectId(folder.id)
                    }}
                    onDragLeave={() => setDragOverProjectId(null)}
                    onDrop={() => handleDropOnFolder(folder.id)}
                    className={`rounded-md p-2 mb-2 border transition-colors ${
                      dragOverProjectId === folder.id
                        ? "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600"
                        : "bg-gray-100 dark:bg-[#2a2a2a] border-gray-400 dark:border-[#383838]"
                    }`}>
                    <div className="flex items-center justify-between">
                      {editingProjectId === folder.id ? (
                        <input
                          value={editProjectTitle}
                          onChange={(e) => setEditProjectTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              saveProjectEdit(folder.id, folder.title)
                            } else if (e.key === "Escape") {
                              cancelProjectEdit()
                            }
                            e.stopPropagation()
                          }}
                          onBlur={() =>
                            saveProjectEdit(folder.id, folder.title)
                          }
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                        />
                      ) : (
                        <button
                          onClick={() => toggleFolderCollapse(folder.id)}
                          className="flex items-center gap-2 flex-1 text-left hover:opacity-70 transition-opacity">
                          <ChevronDown
                            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                              isCollapsed ? "-rotate-90" : ""
                            }`}
                          />
                          <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {folder.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({folderChats.length})
                          </span>
                        </button>
                      )}
                      <Dropdown
                        overlay={
                          <Menu>
                            <Menu.Item
                              key="rename"
                              icon={<PencilIcon className="w-4 h-4" />}
                              onClick={() => startProjectEdit(folder)}>
                              {t("common:rename")}
                            </Menu.Item>
                            <Menu.Item
                              key="delete"
                              icon={<Trash2 className="w-4 h-4" />}
                              danger
                              onClick={() => handleDeleteProject(folder.id)}>
                              {t("common:delete")}
                            </Menu.Item>
                          </Menu>
                        }
                        trigger={["click"]}
                        placement="bottomRight">
                        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </Dropdown>
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col gap-2 mt-2">
                        {groupedFolderChats.map((group, groupIndex) => (
                          <div key={groupIndex}>
                            <h4 className="px-2 text-xs font-medium text-gray-400 mb-1">
                              {t(`common:date:${group.label}`)}
                            </h4>
                            <div className="flex flex-col gap-2">
                              {group.items.map((chat) => renderChatRow(chat))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Unassigned Chats Section */}
              {unassignedChats.length > 0 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverProjectId("unassigned")
                  }}
                  onDragLeave={() => setDragOverProjectId(null)}
                  onDrop={() => handleDropOnFolder(undefined)}
                  className={`rounded-md p-2 ${
                    dragOverProjectId === "unassigned"
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="px-2 text-sm font-medium text-gray-500">
                      {t("common:yourChats", { defaultValue: "Your chats" })}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupChatsByDate(unassignedChats).map(
                      (group, groupIndex) => (
                        <div key={groupIndex}>
                          <h4 className="px-2 text-xs font-medium text-gray-400 mb-1">
                            {t(`common:date:${group.label}`)}
                          </h4>
                          <div className="flex flex-col gap-2">
                            {group.items.map((chat) => renderChatRow(chat))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Search Results or Date-grouped History */}
          {isSearchActive &&
            orderedChatHistories.map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className="flex items-center justify-between mt-2">
                  <h3 className="px-2 text-sm font-medium text-gray-500">
                    {group.label === "searchResults"
                      ? t("common:searchResults")
                      : t(`common:date:${group.label}`)}
                  </h3>
                  {group.label !== "searchResults" && (
                    <Tooltip
                      title={t(`common:range:tooltip:${group.label}`)}
                      placement="top">
                      <button
                        onClick={() =>
                          handleDeleteHistoriesByRange(group.label)
                        }>
                        {deleteRangeLoading && deleteGroup === group.label ? (
                          <Loader2 className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 animate-spin" />
                        ) : (
                          <Trash2Icon className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200" />
                        )}
                      </button>
                    </Tooltip>
                  )}
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {group.items.map((chat) => renderChatRow(chat))}
                </div>
              </div>
            ))}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center mt-4 mb-2">
              <Button
                type="default"
                onClick={handleLoadMore}
                loading={isFetchingNextPage}
                icon={
                  !isFetchingNextPage ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : undefined
                }
                className="flex items-center gap-2 text-sm">
                {isFetchingNextPage
                  ? t("common:loading")
                  : t("common:loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
