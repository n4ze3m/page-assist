import { useStorage } from "@plasmohq/storage/hook"
import { useState } from "react"
import Markdown from "../Markdown"

type Props = {
  message: string
  isNormalMessage?: boolean
}

const MAX_MESSAGE_LENGTH = 500 

export const HumanMessage = ({ message }: Props) => {
  const [useMarkdownForUserMessage] = useStorage("useMarkdownForUserMessage", false)
  const [showMoreForLargeMessage] = useStorage("showMoreForLargeMessage", false)
  const [isExpanded, setIsExpanded] = useState(false)

  const shouldTruncate = showMoreForLargeMessage && message.length > MAX_MESSAGE_LENGTH

  if (useMarkdownForUserMessage) {
    if (shouldTruncate && !isExpanded) {
      const truncatedMessage = message.slice(0, MAX_MESSAGE_LENGTH) + "..."
      return (
        <div>
          <div className="relative">
            <Markdown message={truncatedMessage} />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 dark:from-[#242424] to-transparent pointer-events-none" />
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-gray-700 dark:text-neutral-50 hover:text-gray-900 dark:hover:text-white text-sm mt-2  font-medium shadow-sm hover:shadow-md transition-all">
            Show more
          </button>
        </div>
      )
    }
    return (
      <div>
        <Markdown message={message} />
        {shouldTruncate && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-700 dark:text-neutral-50 hover:text-gray-900 dark:hover:text-white text-sm mt-2  font-medium shadow-sm hover:shadow-md transition-all">
            Show less
          </button>
        )}
      </div>
    )
  }

  if (shouldTruncate && !isExpanded) {
    const truncatedMessage = message.slice(0, MAX_MESSAGE_LENGTH) + "..."
    return (
      <div>
        <div className="relative">
          <span className="whitespace-pre-wrap">{truncatedMessage}</span>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 dark:from-[#242424] to-transparent pointer-events-none" />
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-gray-700 dark:text-neutral-50 hover:text-gray-900 dark:hover:text-white text-sm mt-2 block  font-medium shadow-sm hover:shadow-md transition-all">
          Show more
        </button>
      </div>
    )
  }

  return (
    <div>
      <span className="whitespace-pre-wrap">{message}</span>
      {shouldTruncate && isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-700 dark:text-neutral-50 hover:text-gray-900 dark:hover:text-white text-sm mt-2 block  font-medium shadow-sm hover:shadow-md transition-all">
          Show less
        </button>
      )}
    </div>
  )
}
