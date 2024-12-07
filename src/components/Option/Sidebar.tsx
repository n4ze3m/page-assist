import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  PageAssitDatabase,
  formatToChatHistory,
  formatToMessage,
  deleteByHistoryId,
  updateHistory,
  pinHistory,
  getPromptById
} from "@/db"
import { Empty, Skeleton, Dropdown, Menu } from "antd"
import { useMessageOption } from "~/hooks/useMessageOption"
import {
  PencilIcon,
  Trash2,
  MoreVertical,
  PinIcon,
  PinOffIcon
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  getLastUsedChatModel,
  getLastUsedChatSystemPrompt,
  lastUsedChatModelEnabled
} from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"

type Props = {
  onClose: () => void
}

export const Sidebar = ({ onClose }: Props) => {
  const {
    setMessages,
    setHistory,
    setHistoryId,
    historyId,
    clearChat,
    setSelectedModel,
    temporaryChat,
    setSelectedSystemPrompt
  } = useMessageOption()

  const { setSystemPrompt } = useStoreChatModelSettings()

  const { t } = useTranslation(["option", "common"])
  const client = useQueryClient()
  const navigate = useNavigate()

  const { data: chatHistories, status } = useQuery({
    queryKey: ["fetchChatHistory"],
    queryFn: async () => {
      const db = new PageAssitDatabase()
      const history = await db.getChatHistories()

      const now = new Date()
      const today = new Date(now.setHours(0, 0, 0, 0))
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const lastWeek = new Date(today)
      lastWeek.setDate(lastWeek.getDate() - 7)

      const pinnedItems = history.filter((item) => item.is_pinned)
      const todayItems = history.filter(
        (item) => !item.is_pinned && new Date(item?.createdAt) >= today
      )
      const yesterdayItems = history.filter(
        (item) =>
          !item.is_pinned &&
          new Date(item?.createdAt) >= yesterday &&
          new Date(item?.createdAt) < today
      )
      const lastWeekItems = history.filter(
        (item) =>
          !item.is_pinned &&
          new Date(item?.createdAt) >= lastWeek &&
          new Date(item?.createdAt) < yesterday
      )
      const olderItems = history.filter(
        (item) => !item.is_pinned && new Date(item?.createdAt) < lastWeek
      )

      const groups = []

      if (pinnedItems.length)
        groups.push({ label: "pinned", items: pinnedItems })
      if (todayItems.length) groups.push({ label: "today", items: todayItems })
      if (yesterdayItems.length)
        groups.push({ label: "yesterday", items: yesterdayItems })
      if (lastWeekItems.length)
        groups.push({ label: "last7Days", items: lastWeekItems })
      if (olderItems.length) groups.push({ label: "older", items: olderItems })

      return groups
    }
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

  return (
    <div
      className={`overflow-y-auto z-99 ${temporaryChat ? "pointer-events-none opacity-50" : ""}`}>
      {status === "success" && chatHistories.length === 0 && (
        <div className="flex justify-center items-center mt-20 overflow-hidden">
          <Empty description={t("common:noHistory")} />
        </div>
      )}
      {status === "pending" && (
        <div className="flex justify-center items-center mt-5">
          <Skeleton active paragraph={{ rows: 8 }} />
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
              <h3 className="px-2 text-sm font-medium text-gray-500">
                {t(`common:date:${group.label}`)}
              </h3>
              <div className="flex flex-col gap-2 mt-2">
                {group.items.map((chat, index) => (
                  <div
                    key={index}
                    className="flex py-2 px-2 items-start gap-3 relative rounded-md truncate hover:pr-4 group transition-opacity duration-300 ease-in-out bg-gray-100 dark:bg-[#232222] dark:text-gray-100 text-gray-800 border hover:bg-gray-200 dark:hover:bg-[#2d2d2d] dark:border-gray-800">
                    <button
                      className="flex-1 overflow-hidden break-all text-start truncate w-full"
                      onClick={async () => {
                        const db = new PageAssitDatabase()
                        const history = await db.getChatHistory(chat.id)
                        setHistoryId(chat.id)
                        setHistory(formatToChatHistory(history))
                        setMessages(formatToMessage(history))
                        const isLastUsedChatModel =
                          await lastUsedChatModelEnabled()
                        if (isLastUsedChatModel) {
                          const currentChatModel = await getLastUsedChatModel(
                            chat.id
                          )
                          if (currentChatModel) {
                            setSelectedModel(currentChatModel)
                          }
                        }
                        const lastUsedPrompt =
                          await getLastUsedChatSystemPrompt(chat.id)
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
        </div>
      )}
    </div>
  )
}
