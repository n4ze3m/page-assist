import React from "react"
import { handleChatInputKeyDown } from "@/utils/key-down"

export type UseChatKeydownParams = {
  sendWhenEnter: boolean
  typing: boolean
  isSending: boolean
  onSubmit: () => void
  // If provided and returns true, will early return (used for mentions menu, etc.)
  extraGuard?: (e: React.KeyboardEvent) => boolean
  // Some environments need special Firefox/IME handling; default true
  guardProcessKey?: boolean
}

export function useChatKeydown({
  sendWhenEnter,
  typing,
  isSending,
  onSubmit,
  extraGuard,
  guardProcessKey = true
}: UseChatKeydownParams) {
  return React.useCallback(
    (e: React.KeyboardEvent) => {
      // IME/Firefox keyguard
      if (guardProcessKey && (e.key === "Process" || e.key === "229")) return

      if (extraGuard && extraGuard(e)) return

      if (
        handleChatInputKeyDown({
          e,
          sendWhenEnter,
          typing,
          isSending
        })
      ) {
        e.preventDefault()
        onSubmit()
      }
    },
    [sendWhenEnter, typing, isSending, onSubmit, extraGuard, guardProcessKey]
  )
}
