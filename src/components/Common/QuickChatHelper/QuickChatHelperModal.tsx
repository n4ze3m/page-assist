import React, { useRef, useEffect, useCallback } from "react"
import { Modal, Button, Tooltip } from "antd"
import { ExternalLink, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useQuickChat } from "@/hooks/useQuickChat"
import { useQuickChatStore } from "@/store/quick-chat"
import { QuickChatMessage } from "./QuickChatMessage"
import { QuickChatInput } from "./QuickChatInput"
import { browser } from "wxt/browser"

type Props = {
  open: boolean
  onClose: () => void
}

export const QuickChatHelperModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation(["option", "common"])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    sendMessage,
    cancelStream,
    isStreaming,
    hasModel
  } = useQuickChat()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handlePopOut = useCallback(() => {
    // Serialize current state to sessionStorage
    const state = useQuickChatStore.getState().getSerializableState()
    const stateKey = `quickchat_${Date.now()}`
    sessionStorage.setItem(stateKey, JSON.stringify(state))

    // Open pop-out window
    const popoutUrl = browser.runtime.getURL(
      `/options.html#/quick-chat-popout?state=${stateKey}`
    )
    const popoutWindow = window.open(
      popoutUrl,
      "quickChatHelper",
      "width=480,height=600,menubar=no,toolbar=no,location=no,status=no"
    )

    if (popoutWindow) {
      useQuickChatStore.getState().setPopoutWindow(popoutWindow)
      onClose()
    }
  }, [onClose])

  const title = t("quickChatHelper.title", "Quick Chat Helper")
  const emptyState = t(
    "quickChatHelper.emptyState",
    "Start a quick side chat to keep your main thread clean."
  )
  const popOutLabel = t("quickChatHelper.popOutButton", "Pop out")

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-8">
          <span>{title}</span>
          <Tooltip title={popOutLabel}>
            <Button
              type="text"
              size="small"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={handlePopOut}
              aria-label={popOutLabel}
              disabled={messages.length === 0}
            />
          </Tooltip>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      className="quick-chat-helper-modal"
      destroyOnClose={false}
      maskClosable={true}
      keyboard={true}
      aria-labelledby="quick-chat-title"
      aria-describedby="quick-chat-description">
      <div className="flex flex-col h-[50vh] max-h-[400px]">
        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto px-1 py-2"
          role="log"
          aria-live="polite"
          aria-label={t("common:chatMessages", "Chat messages")}>
          {messages.length === 0 ? (
            <div
              id="quick-chat-description"
              className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center px-4">
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
        <QuickChatInput
          onSend={sendMessage}
          onCancel={cancelStream}
          isStreaming={isStreaming}
          disabled={!hasModel}
        />
      </div>
    </Modal>
  )
}

export default QuickChatHelperModal
