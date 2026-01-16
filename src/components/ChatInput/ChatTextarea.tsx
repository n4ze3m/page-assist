import React from "react"
import useDynamicTextareaSize from "~/hooks/useDynamicTextareaSize"
import { useChatKeydown } from "@/hooks/chat-input/useKeydownHandler"

interface ChatTextareaProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  onPaste?: (e: React.ClipboardEvent) => void
  sendWhenEnter: boolean
  typing: boolean
  isSending: boolean
  onSubmit: () => void
  setTyping: (typing: boolean) => void
  guardProcessKey?: boolean
  extraGuard?: (e: React.KeyboardEvent) => boolean
  minHeight?: number
}

export const ChatTextarea: React.FC<ChatTextareaProps> = ({
  textareaRef,
  value,
  onChange,
  onKeyDown: externalOnKeyDown,
  placeholder,
  onPaste,
  sendWhenEnter,
  typing,
  isSending,
  onSubmit,
  setTyping,
  guardProcessKey = true,
  extraGuard,
  minHeight = 50
}) => {
  const internalOnKeyDown = useChatKeydown({
    sendWhenEnter,
    typing,
    isSending,
    onSubmit,
    extraGuard,
    guardProcessKey
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (externalOnKeyDown) {
      externalOnKeyDown(e)
    }
    internalOnKeyDown(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  useDynamicTextareaSize(textareaRef, value, 120)

  return (
    <textarea
      data-testid="chat-textarea"
      onKeyDown={handleKeyDown}
      ref={textareaRef}
      className="pa-textarea"
      onPaste={onPaste}
      rows={1}
      style={{ minHeight: `${minHeight}px` }}
      tabIndex={0}
      onCompositionStart={() => {
        if (import.meta.env.BROWSER !== "firefox") {
          setTyping(true)
        }
      }}
      onCompositionEnd={() => {
        if (import.meta.env.BROWSER !== "firefox") {
          setTyping(false)
        }
      }}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
    />
  )
}
