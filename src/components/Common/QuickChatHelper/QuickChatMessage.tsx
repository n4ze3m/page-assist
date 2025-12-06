import React from "react"
import { QuickChatMessage as QuickChatMessageType } from "@/store/quick-chat"
import Markdown from "@/components/Common/Markdown"
import { classNames } from "@/libs/class-name"
import { useTranslation } from "react-i18next"

type Props = {
  message: QuickChatMessageType
  isStreaming?: boolean
  isLast?: boolean
}

export const QuickChatMessage: React.FC<Props> = ({
  message,
  isStreaming = false,
  isLast = false
}) => {
  const { t } = useTranslation("option")
  const isUser = message.role === "user"
  const showStreamingCursor = isStreaming && isLast && !isUser

  return (
    <div
      className={classNames(
        "flex w-full mb-3",
        isUser ? "justify-end" : "justify-start"
      )}
      role="article"
      aria-label={
        isUser
          ? t("quickChatHelper.userMessageAria", "Your message")
          : t("quickChatHelper.assistantMessageAria", "Assistant message")
      }>
      <div
        className={classNames(
          "max-w-[85%] rounded-lg px-3 py-2",
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        )}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className="text-sm">
            {message.content ? (
              <Markdown
                message={message.content + (showStreamingCursor ? "▋" : "")}
                className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none"
              />
            ) : showStreamingCursor ? (
              <span className="inline-block animate-pulse">▋</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickChatMessage
