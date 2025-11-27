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
import { promptInput } from "@/components/Common/prompt-input"
import { useConfirmDanger } from "@/components/Common/confirm-danger"
import { IconButton } from "../Common/IconButton"
import { useServerChatHistory } from "@/hooks/useServerChatHistory"
import { useConnectionState } from "@/hooks/useConnectionState"
import { useStoreMessageOption } from "@/store/option"
import { tldwClient } from "@/services/tldw/TldwApiClient"

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
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const confirmDanger = useConfirmDanger()
  const { isConnected } = useConnectionState()
  const {
    serverChatId,
    setServerChatId,
    setServerChatState,
    setServerChatTopic,
    setServerChatClusterId,
    setServerChatSource,
    setServerChatExternalRef
  } = useStoreMessageOption()
  const {
    data: serverChatData,
    status: serverStatus,
    isLoading: isServerLoading
  } = useServerChatHistory(debouncedSearchQuery)
  const serverChats = serverChatData || []

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
        if (pinnedItems.length)
          groups.push({ label: "pinned", items: pinnedItems })
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
        // Merge groups with same labels
        page.groups.forEach((group) => {
          const existingGroup = acc.find((g) => g.label === group.label)
          if (existingGroup) {
            existingGroup.items.push(...group.items)
          } else {
            acc.push({ ...group })
          }
        })
        return acc
      },
      [] as Array<{ label: string; items: any[] }>
    ) || []

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

  const handleDeleteHistoriesByRange = async (rangeLabel: string) => {
    const ok = await confirmDanger({
      title: t("common:confirmTitle", { defaultValue: "Please confirm" }),
      content: t(`common:range:deleteConfirm:${rangeLabel}`),
      okText: t("common:delete", { defaultValue: "Delete" }),
      cancelText: t("common:cancel", { defaultValue: "Cancel" })
    })
    if (!ok) return
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
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={t("common:clearSearch", { defaultValue: "Clear search" })}>
                  ✕
                </button>
              ) : null
            }
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-[#232222]"
          />
        </div>
      </div>

      {status === "success" &&
        chatHistories.length === 0 &&
        serverStatus === "success" &&
        serverChats.length === 0 &&
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

      {serverStatus === "pending" && (
        <div className="flex justify-center items-center mt-2">
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      )}

      {serverStatus === "error" && (
        <div className="flex justify-center items-center mt-2 px-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("common:serverChatsUnavailable", {
              defaultValue: isConnected
                ? "Server chats unavailable right now. Check your server logs or try again."
                : "Server chats are available once you connect to your tldw server."
            })}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="flex justify-center items-center">
          <span className="text-red-500">Error loading history</span>
        </div>
      )}

      {status === "success" && chatHistories.length > 0 && (
        <div className="flex flex-col gap-2">
          {chatHistories.map((group, groupIndex) => (
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
                        : "bg-gray-50 dark:bg-[#232222] dark:text-gray-100 text-gray-800 border-gray-300 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]"
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
                        // Switch to a local Dexie-backed chat; clear any active server-backed session id.
                        setServerChatId(null)
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
                          <Menu id={`history-actions-${chat.id}`}>
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
                              onClick={async () => {
                                const newTitle = await promptInput({
                                  title: t("editHistoryTitle", { defaultValue: "Rename chat" }),
                                  defaultValue: chat.title,
                                  okText: t("common:save", { defaultValue: "Save" }),
                                  cancelText: t("common:cancel", { defaultValue: "Cancel" })
                                })
                                if (newTitle && newTitle !== chat.title) {
                                  editHistory({ id: chat.id, title: newTitle })
                                }
                              }}>
                              {t("common:edit")}
                            </Menu.Item>
                            <Menu.Item
                              key="delete"
                              icon={<Trash2 className="w-4 h-4" />}
                              danger
                              onClick={async () => {
                                const ok = await confirmDanger({
                                  title: t("common:confirmTitle", {
                                    defaultValue: "Please confirm"
                                  }),
                                  content: t("deleteHistoryConfirmation"),
                                  okText: t("common:delete", {
                                    defaultValue: "Delete"
                                  }),
                                  cancelText: t("common:cancel", {
                                    defaultValue: "Cancel"
                                  })
                                })
                                if (!ok) return
                                deleteHistory(chat.id)
                              }}>
                              {t("common:delete")}
                            </Menu.Item>
                          </Menu>
                        }
                        trigger={["click"]}
                        placement="bottomRight"
                        open={openMenuFor === chat.id}
                        onOpenChange={(o) => setOpenMenuFor(o ? chat.id : null)}>
                        <IconButton
                          className="text-gray-500 dark:text-gray-400 opacity-80 hover:opacity-100"
                          ariaLabel={`${t("option:header.moreActions", "More actions")}: ${chat.title}`}
                          hasPopup="menu"
                          ariaExpanded={openMenuFor === chat.id}
                          ariaControls={`history-actions-${chat.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </IconButton>
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

      {serverStatus === "success" && serverChats.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800 pt-3">
          <div className="flex items-center justify-between mt-1">
            <h3 className="px-2 text-sm font-medium text-gray-500">
              {t("common:serverChats", { defaultValue: "Server chats" })}
            </h3>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            {serverChats.map((chat) => (
              <button
                key={chat.id}
                className={`flex py-2 px-2 items-center gap-3 relative rounded-md truncate hover:pr-4 group transition-opacity duration-300 ease-in-out border text-left ${
                  serverChatId === chat.id
                    ? "bg-gray-200 dark:bg-[#454242] border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    : "bg-gray-50 dark:bg-[#232222] dark:text-gray-100 text-gray-800 border-gray-300 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]"
                }`}
                onClick={async () => {
                  try {
                    // Clear local selection; this chat is backed by the server
                    setHistoryId(null)
                    setServerChatId(chat.id)
                    setServerChatState(
                      (chat as any)?.state ??
                        (chat as any)?.conversation_state ??
                        "in-progress"
                    )
                    setServerChatTopic((chat as any)?.topic_label ?? null)
                    setServerChatClusterId(
                      (chat as any)?.cluster_id ?? null
                    )
                    setServerChatSource((chat as any)?.source ?? null)
                    setServerChatExternalRef(
                      (chat as any)?.external_ref ?? null
                    )
                    // Try to resolve a friendly assistant name from the character, if any.
                    let assistantName = "Assistant"
                    if (chat.character_id != null) {
                      try {
                        const character = await tldwClient.getCharacter(
                          chat.character_id
                        )
                        if (character) {
                          assistantName =
                            character.name ||
                            character.title ||
                            assistantName
                        }
                      } catch {
                        // Fallback to generic label if character lookup fails.
                      }
                    }

                    const messages = await tldwClient.listChatMessages(
                      chat.id,
                      {
                        include_deleted: "false"
                      } as any
                    )
                    const history = messages.map((m) => ({
                      role: m.role,
                      content: m.content
                    }))
                    const mappedMessages = messages.map((m) => ({
                      isBot: m.role === "assistant",
                      name:
                        m.role === "assistant"
                          ? assistantName
                          : m.role === "system"
                            ? "System"
                            : "You",
                      message: m.content,
                      sources: [],
                      images: [],
                      serverMessageId: m.id,
                      serverMessageVersion: m.version
                    }))
                    setHistory(history)
                    setMessages(mappedMessages)
                    updatePageTitle(chat.title)
                    navigate("/")
                    onClose()
                  } catch (e) {
                    console.error("Failed to load server chat", e)
                    message.error(
                      t("common:serverChatLoadError", {
                        defaultValue:
                          "Failed to load server chat. Check your connection and try again."
                      })
                    )
                  }
                }}>
                <div className="flex flex-col overflow-hidden flex-1">
                  <span className="truncate text-sm">{chat.title}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium lowercase text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                      {(chat.state as string) || "in-progress"}
                    </span>
                    {chat.topic_label && (
                      <span
                        className="truncate max-w-[12rem]"
                        title={String(chat.topic_label)}
                      >
                        {String(chat.topic_label)}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {chat.parent_conversation_id ? (
                      <Tooltip
                        title={t("common:serverChatForkedTooltip", {
                          defaultValue: `Forked from chat ${String(
                            chat.parent_conversation_id
                          ).slice(0, 8)}`
                        })}>
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="size-3" />
                          <span>
                            {t("common:serverChatForkedLabel", {
                              defaultValue: "Forked chat"
                            })}
                          </span>
                        </span>
                      </Tooltip>
                    ) : (
                      <span>
                        {t("common:serverChatSourceLabel", {
                          defaultValue: "Server"
                        })}
                      </span>
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
