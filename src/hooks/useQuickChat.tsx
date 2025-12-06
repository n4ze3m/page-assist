import { useCallback, useRef } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuickChatStore, QuickChatMessage } from "@/store/quick-chat"
import { TldwChatService, TldwChatOptions } from "@/services/tldw/TldwChat"
import { ChatMessage } from "@/services/tldw/TldwApiClient"

// Create a dedicated chat service instance for quick chat
const quickChatService = new TldwChatService()

export const useQuickChat = () => {
  const [selectedModel] = useStorage<string>("selectedModel")
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    messages,
    addMessage,
    updateLastMessage,
    clearMessages,
    isStreaming,
    setIsStreaming,
    isOpen,
    setIsOpen
  } = useQuickChatStore()

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !selectedModel || isStreaming) {
        return
      }

      // Add user message
      addMessage("user", content)

      // Add placeholder for assistant message
      addMessage("assistant", "")

      setIsStreaming(true)

      try {
        // Build chat history for the API
        const currentMessages = useQuickChatStore.getState().messages
        const chatHistory: ChatMessage[] = currentMessages
          .slice(0, -1) // Exclude the empty assistant placeholder
          .map((msg: QuickChatMessage) => ({
            role: msg.role,
            content: msg.content
          }))

        const options: TldwChatOptions = {
          model: selectedModel,
          stream: true
        }

        let fullContent = ""

        // Stream the response
        for await (const chunk of quickChatService.streamMessage(
          chatHistory,
          options
        )) {
          fullContent += chunk
          updateLastMessage(fullContent)
        }
      } catch (error) {
        // Check if it's an abort error
        if (error instanceof Error && error.name === "AbortError") {
          // Stream was cancelled, don't show error
          return
        }

        console.error("Quick chat error:", error)
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred"
        updateLastMessage(`Error: ${errorMessage}`)
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [selectedModel, isStreaming, addMessage, updateLastMessage, setIsStreaming]
  )

  const cancelStream = useCallback(() => {
    quickChatService.cancelStream()
    setIsStreaming(false)
  }, [setIsStreaming])

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [setIsOpen])

  const closeModal = useCallback(() => {
    cancelStream()
    setIsOpen(false)
  }, [cancelStream, setIsOpen])

  return {
    messages,
    sendMessage,
    cancelStream,
    clearMessages,
    isStreaming,
    isOpen,
    openModal,
    closeModal,
    hasModel: !!selectedModel
  }
}
