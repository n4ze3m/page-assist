import { Message } from "@/types/message"
import React, { Dispatch, SetStateAction, createContext } from "react"

interface PageAssistContext {
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>

  controller: AbortController | null
  setController: Dispatch<SetStateAction<AbortController>>

  embeddingController: AbortController | null
  setEmbeddingController: Dispatch<SetStateAction<AbortController>>
}

export const PageAssistContext = createContext<PageAssistContext>({
  messages: [],
  setMessages: () => {},

  controller: null,
  setController: () => {},

  embeddingController: null,
  setEmbeddingController: () => {}
})

export const usePageAssist = () => {
  const context = React.useContext(PageAssistContext)
  if (!context) {
    throw new Error("usePageAssist must be used within a PageAssistContext")
  }
  return context
}
