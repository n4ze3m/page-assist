import { PageAssistContext } from "@/context"
import { Message } from "@/types/message"
import React from "react"

export const PageAssistProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [controller, setController] = React.useState<AbortController | null>(
    null
  )
  const [embeddingController, setEmbeddingController] =
    React.useState<AbortController | null>(null)

  return (
    <PageAssistContext.Provider
      value={{
        messages,
        setMessages,

        controller,
        setController,

        embeddingController,
        setEmbeddingController
      }}>
      {children}
    </PageAssistContext.Provider>
  )
}
