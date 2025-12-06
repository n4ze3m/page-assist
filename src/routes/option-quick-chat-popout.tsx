import React, { useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuickChatStore } from "@/store/quick-chat"
import { useQuickChat } from "@/hooks/useQuickChat"
import { QuickChatMessage } from "@/components/Common/QuickChatHelper/QuickChatMessage"
import { QuickChatInput } from "@/components/Common/QuickChatHelper/QuickChatInput"
import { AlertCircle } from "lucide-react"

const QuickChatPopout: React.FC = () => {
  const { t } = useTranslation(["option", "common"])
  const [searchParams] = useSearchParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasRestoredRef = useRef(false)

  const {
    messages,
    sendMessage,
    cancelStream,
    isStreaming,
    hasModel
  } = useQuickChat()

  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (hasRestoredRef.current) return

    const stateKey = searchParams.get("state")
    if (stateKey) {
      try {
        const savedState = sessionStorage.getItem(stateKey)
        if (savedState) {
          const parsed = JSON.parse(savedState)
          useQuickChatStore.getState().restoreFromState(parsed)
          // Clean up sessionStorage
          sessionStorage.removeItem(stateKey)
        }
      } catch (error) {
        console.error("Failed to restore quick chat state:", error)
      }
    }
    hasRestoredRef.current = true
  }, [searchParams])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Clear messages on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      useQuickChatStore.getState().clearMessages()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  const title = t("quickChatHelper.title", "Quick Chat Helper")
  const emptyState = t(
    "quickChatHelper.emptyState",
    "Start a quick side chat to keep your main thread clean."
  )

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label={t("common:chatMessages", "Chat messages")}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center px-4">
            <p className="text-sm">{emptyState}</p>
            {!hasModel && (
              <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {t(
                    "quickChatHelper.noModelWarning",
                    "Please select a model in the main chat first."
                  )}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <QuickChatMessage
                key={message.id}
                message={message}
                isStreaming={isStreaming}
                isLast={index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <QuickChatInput
          onSend={sendMessage}
          onCancel={cancelStream}
          isStreaming={isStreaming}
          disabled={!hasModel}
        />
      </div>
    </div>
  )
}

export default QuickChatPopout
