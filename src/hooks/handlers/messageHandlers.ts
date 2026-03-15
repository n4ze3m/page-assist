import { type ChatHistory, type Message } from "~/store/option"
import {
  deleteChatForEdit,
  formatToChatHistory,
  formatToMessage,
  updateMessageByIndex
} from "@/db/dexie/helpers"
import { validateBeforeSubmit } from "../utils/messageHelpers"
import { generateBranchMessage } from "@/db/dexie/branch"
import { getPromptById, getSessionFiles, UploadedFile } from "@/db"

export const createRegenerateLastMessage = ({
  validateBeforeSubmitFn,
  history,
  messages,
  setHistory,
  setMessages,
  historyId,
  removeMessageUsingHistoryIdFn,
  onSubmit
}: {
  validateBeforeSubmitFn: () => boolean
  history: ChatHistory | (() => ChatHistory)
  messages: Message[] | (() => Message[])
  setHistory: (history: ChatHistory) => void
  setMessages: (messages: Message[]) => void
  historyId: string | null | (() => string | null)
  removeMessageUsingHistoryIdFn: (id: string | null) => Promise<void>
  onSubmit: (params: any) => Promise<void>
}) => {
  return async () => {
    const currentHistory =
      typeof history === "function" ? history() : history
    const currentMessages =
      typeof messages === "function" ? messages() : messages
    const currentHistoryId =
      typeof historyId === "function" ? historyId() : historyId
    const isOk = validateBeforeSubmitFn()

    if (!isOk) {
      return
    }
    if (currentHistory.length > 0) {
      const lastUserIndex = currentHistory.findLastIndex(
        (message) => message.role === "user"
      )

      if (lastUserIndex === -1) {
        return
      }

      const lastMessage = currentHistory[lastUserIndex]
      const newHistory = currentHistory.slice(0, lastUserIndex)
      const newMessages = currentMessages.slice(0, lastUserIndex + 1)

      setHistory(newHistory)
      setMessages(newMessages)
      await removeMessageUsingHistoryIdFn(currentHistoryId)

      if (lastMessage.role === "user") {
        const newController = new AbortController()
        await onSubmit({
          message: lastMessage.content,
          image: lastMessage.image || "",
          images: lastMessage.images || [],
          isRegenerate: true,
          messages: newMessages,
          memory: newHistory,
          controller: newController
        })
      }
    }
  }
}

export const createEditMessage = ({
  messages,
  history,
  setMessages,
  setHistory,
  historyId,
  validateBeforeSubmitFn,
  onSubmit
}: {
  messages: Message[] | (() => Message[])
  history: ChatHistory | (() => ChatHistory)
  setMessages: (messages: Message[]) => void
  setHistory: (history: ChatHistory) => void
  historyId: string | null | (() => string | null)
  validateBeforeSubmitFn: () => boolean
  onSubmit: (params: any) => Promise<void>
}) => {
  return async (
    index: number,
    message: string,
    isHuman: boolean,
    isSend: boolean
  ) => {
    const currentMessages =
      typeof messages === "function" ? messages() : messages
    const currentHistory =
      typeof history === "function" ? history() : history
    const currentHistoryId =
      typeof historyId === "function" ? historyId() : historyId
    const newMessages = currentMessages.map((currentMessage, currentIndex) =>
      currentIndex === index
        ? {
            ...currentMessage,
            message
          }
        : currentMessage
    )
    const newHistory = currentHistory.map((currentMessage, currentIndex) =>
      currentIndex === index
        ? {
            ...currentMessage,
            content: message
          }
        : currentMessage
    )

    // if human message and send then only trigger the submit
    if (isHuman && isSend) {
      const isOk = validateBeforeSubmitFn()

      if (!isOk) {
        return
      }

      const currentHumanMessage = newMessages[index]
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(currentHistoryId, index, message)
      await deleteChatForEdit(currentHistoryId, index)
      const abortController = new AbortController()
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController,
        images: currentHumanMessage.images || []
      })
      return
    }

    setMessages(newMessages)
    setHistory(newHistory)
    await updateMessageByIndex(currentHistoryId, index, message)
  }
}

export const createBranchMessage = ({
  setMessages,
  setHistory,
  historyId,
  getHistoryId,
  setHistoryId,
  setContext,
  setSelectedSystemPrompt,
  setSystemPrompt
}: {
  setMessages: (messages: Message[]) => void
  setHistory: (history: ChatHistory) => void
  historyId: string | null
  getHistoryId?: () => string | null
  setHistoryId: (id: string | null) => void
  setSelectedSystemPrompt?: (prompt: string) => void
  setSystemPrompt?: (prompt: string) => void
  setContext?: (context: UploadedFile[]) => void
}) => {
  return async (index: number) => {
    try {
      const activeHistoryId = getHistoryId?.() ?? historyId
      const newBranch = await generateBranchMessage(activeHistoryId, index)
      setHistory(formatToChatHistory(newBranch.messages))
      setMessages(formatToMessage(newBranch.messages))
      setHistoryId(newBranch.history.id)
      const systemFiles = await getSessionFiles(newBranch.history.id)
      if (setContext) {
        setContext(systemFiles)
      }

      const lastUsedPrompt = newBranch?.history?.last_used_prompt
      if (lastUsedPrompt) {
        if (lastUsedPrompt.prompt_id) {
          const prompt = await getPromptById(lastUsedPrompt.prompt_id)
          if (prompt) {
            setSelectedSystemPrompt(lastUsedPrompt.prompt_id)
          }
        }
        setSystemPrompt(lastUsedPrompt.prompt_content)
      }
    } catch (e) {
      console.log(`[branch] ${e}`)
    }
  }
}

export const createStopStreamingRequest = (
  abortController: AbortController | null,
  setAbortController: (controller: AbortController | null) => void
) => {
  return () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }
}
