import React, { useState, useRef, useCallback, useEffect } from "react"
import { Button, Input } from "antd"
import { Send, Square } from "lucide-react"
import { useTranslation } from "react-i18next"

const { TextArea } = Input

type Props = {
  onSend: (message: string) => void
  onCancel: () => void
  isStreaming: boolean
  disabled?: boolean
  placeholder?: string
}

export const QuickChatInput: React.FC<Props> = ({
  onSend,
  onCancel,
  isStreaming,
  disabled = false,
  placeholder
}) => {
  const { t } = useTranslation("option")
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (value.trim() && !isStreaming && !disabled) {
      onSend(value.trim())
      setValue("")
    }
  }, [value, isStreaming, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Focus input when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const inputPlaceholder =
    placeholder ||
    t("quickChatHelper.inputPlaceholder", "Ask a quick question...")

  return (
    <div className="flex gap-2 items-end border-t border-gray-200 dark:border-gray-700 pt-3">
      <TextArea
        ref={textareaRef as any}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={inputPlaceholder}
        disabled={disabled}
        autoSize={{ minRows: 1, maxRows: 4 }}
        className="flex-1 resize-none"
        aria-label={inputPlaceholder}
      />
      {isStreaming ? (
        <Button
          type="default"
          icon={<Square className="h-4 w-4" />}
          onClick={onCancel}
          aria-label={t("common:stop", "Stop")}
          title={t("common:stop", "Stop")}
        />
      ) : (
        <Button
          type="primary"
          icon={<Send className="h-4 w-4" />}
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label={t("quickChatHelper.sendButton", "Send")}
          title={t("quickChatHelper.sendButton", "Send")}
        />
      )}
    </div>
  )
}

export default QuickChatInput
