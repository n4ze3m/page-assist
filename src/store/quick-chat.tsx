import { create } from "zustand"

export type QuickChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

type QuickChatStore = {
  // Modal visibility
  isOpen: boolean
  setIsOpen: (open: boolean) => void

  // Chat messages (ephemeral, in-memory only)
  messages: QuickChatMessage[]
  addMessage: (role: "user" | "assistant", content: string) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void

  // Streaming state
  isStreaming: boolean
  setIsStreaming: (streaming: boolean) => void

  // Pop-out window reference
  popoutWindow: Window | null
  setPopoutWindow: (win: Window | null) => void

  // For state transfer to pop-out
  getSerializableState: () => { messages: QuickChatMessage[] }
  restoreFromState: (state: { messages: QuickChatMessage[] }) => void
}

export const useQuickChatStore = create<QuickChatStore>((set, get) => ({
  isOpen: false,
  messages: [],
  isStreaming: false,
  popoutWindow: null,

  setIsOpen: (open) => {
    set({ isOpen: open })
    // Clear messages when closing
    if (!open) {
      set({ messages: [], isStreaming: false })
    }
  },

  addMessage: (role, content) => {
    const newMessage: QuickChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now()
    }
    set((state) => ({
      messages: [...state.messages, newMessage]
    }))
  },

  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        const lastIndex = messages.length - 1
        messages[lastIndex] = {
          ...messages[lastIndex],
          content
        }
      }
      return { messages }
    })
  },

  clearMessages: () => {
    set({ messages: [], isStreaming: false })
  },

  setIsStreaming: (streaming) => {
    set({ isStreaming: streaming })
  },

  setPopoutWindow: (win) => {
    set({ popoutWindow: win })
  },

  getSerializableState: () => {
    const state = get()
    return {
      messages: state.messages
    }
  },

  restoreFromState: (restoredState) => {
    set({
      messages: restoredState.messages || []
    })
  }
}))

// Expose for debugging in non-production builds
if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV !== "production"
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__tldw_useQuickChatStore = useQuickChatStore
}
