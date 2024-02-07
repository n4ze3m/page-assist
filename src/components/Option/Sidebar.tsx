import { useQuery } from "@tanstack/react-query"
import {
  PageAssitDatabase,
  formatToChatHistory,
  formatToMessage
} from "~libs/db"
import { Empty, Skeleton } from "antd"
import { useMessageOption } from "~hooks/useMessageOption"

type Props = {}

export const Sidebar = ({}: Props) => {
  const { setMessages, setHistory, setHistoryId } = useMessageOption()

  const { data: chatHistories, status } = useQuery({
    queryKey: ["fetchChatHistory"],
    queryFn: async () => {
      const db = new PageAssitDatabase()
      const history = await db.getChatHistories()
      return history
    }
  })

  return (
    <div className="overflow-y-auto">
      {status === "success" && chatHistories.length === 0 && (
        <div className="flex justify-center items-center mt-20 overflow-hidden">
          <Empty description="No history yet" />
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
          {chatHistories.map((chat, index) => (
            <button
              onClick={async () => {
                const db = new PageAssitDatabase()
                const history = await db.getChatHistory(chat.id)
                setHistoryId(chat.id)
                setHistory(formatToChatHistory(history))
                setMessages(formatToMessage(history))
              }}
              key={index}
              className="flex text-start py-2 px-2 cursor-pointer items-start gap-3 relative rounded-md truncate hover:pr-4 group transition-opacity duration-300 ease-in-out  bg-gray-100 dark:bg-[#232222] dark:text-gray-100 text-gray-800 border hover:bg-gray-200 dark:hover:bg-[#2d2d2d] dark:border-gray-800">
              <span className="flex-grow truncate">{chat.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
