import {
  useMutation,
  useQueryClient,
  useInfiniteQuery
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
  GitBranch
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
  getPromptById
} from "@/db/dexie/helpers"
import { UploadedFile } from "@/db/dexie/types"
import { isDatabaseClosedError } from "@/utils/ff-error"
import { updatePageTitle } from "@/utils/update-page-title"

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
  setContext
}: Props) => {
  const { t } = useTranslation(["option", "common"])
  const client = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [deleteGroup, setDeleteGroup] = useState<string | null>(null)
  const [dexiePrivateWindowError, setDexiePrivateWindowError] = useState(false)

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
            const pinnedOnlyItems = allPinnedItems.filter((item) => item.is_pinned)
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
              newItem => !existingGroup.items.some(existingItem => existingItem.id === newItem.id)
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
    const order = ["pinned", "today", "yesterday", "last7Days", "older", "searchResults"]
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

  const clearSearch = () => {
    setSearchQuery("")
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
          {orderedChatHistories.map((group, groupIndex) => (
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
                      onClick={() => handleDeleteHistoriesByRange(group.label)}>
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
                {group.items.map((chat, index) => (
                  <div
                    key={chat.id}
                    className={`flex py-2 px-2 items-center gap-3 relative rounded-md truncate hover:pr-4 group transition-opacity duration-300 ease-in-out border ${
                      historyId === chat.id
                        ? "bg-gray-200 dark:bg-[#454242] border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        : "bg-gray-50 dark:bg-[#242424] dark:text-gray-100 text-gray-800 border-gray-300 dark:border-[#404040] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]"
                    }`}>
                    {chat?.message_source === "copilot" && (
                      <BotIcon className="size-3 text-gray-500 dark:text-gray-400" />
                    )}
                    {chat?.message_source === "branch" && (
                      <GitBranch className="size-3 text-gray-500 dark:text-gray-400" />
                    )}
                    <button
                      className="flex-1 overflow-hidden break-all text-start truncate w-full"
                      onClick={async () => {
                        const db = new PageAssistDatabase()
                        const history = await db.getChatHistory(chat.id)
                        const historyDetails = await db.getHistoryInfo(chat.id)
                        setHistoryId(chat.id)
                        setHistory(formatToChatHistory(history))
                        setMessages(formatToMessage(history))
                        const isLastUsedChatModel =
                          await lastUsedChatModelEnabled()
                        if (isLastUsedChatModel) {
                          const currentChatModel = historyDetails?.model_id
                          if (currentChatModel) {
                            setSelectedModel(currentChatModel)
                          }
                        }
                        const lastUsedPrompt = historyDetails?.last_used_prompt
                        if (lastUsedPrompt) {
                          if (lastUsedPrompt.prompt_id) {
                            const prompt = await getPromptById(
                              lastUsedPrompt.prompt_id
                            )
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
                              {chat.is_pinned
                                ? t("common:unpin")
                                : t("common:pin")}
                            </Menu.Item>
                            <Menu.Item
                              key="edit"
                              icon={<PencilIcon className="w-4 h-4" />}
                              onClick={() => {
                                const newTitle = prompt(
                                  t("editHistoryTitle"),
                                  chat.title
                                )
                                if (newTitle) {
                                  editHistory({ id: chat.id, title: newTitle })
                                }
                              }}>
                              {t("common:edit")}
                            </Menu.Item>
                            <Menu.Item
                              key="delete"
                              icon={<Trash2 className="w-4 h-4" />}
                              danger
                              onClick={() => {
                                if (!confirm(t("deleteHistoryConfirmation")))
                                  return
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
                ))}
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
