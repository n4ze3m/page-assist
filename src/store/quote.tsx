import { create } from "zustand"

type State = {
  // Text the user selected in an assistant message and chose to reply to.
  // Shown as a chip above the composer and prepended to the next message as
  // a markdown blockquote.
  quotedText: string | null
  setQuotedText: (quotedText: string | null) => void
  clearQuotedText: () => void
}

export const useQuoteReply = create<State>((set) => ({
  quotedText: null,
  setQuotedText: (quotedText) => set({ quotedText }),
  clearQuotedText: () => set({ quotedText: null })
}))
