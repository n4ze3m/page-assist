import { type ChatHistory, type Message } from "~/store/option"
import {
  deleteChatForEdit,
  formatToChatHistory,
  formatToMessage,
  updateMessageByIndex
} from "@/db/dexie/helpers"
import { generateBranchMessage } from "@/db/dexie/branch"
import { getPromptById, getSessionFiles, UploadedFile } from "@/db"
import { tldwClient, type ConversationState } from "@/services/tldw/TldwApiClient"
import { notification } from "antd"

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
  history: ChatHistory
  messages: Message[]
  setHistory: (history: ChatHistory) => void
  setMessages: (messages: Message[]) => void
  historyId: string | null
  removeMessageUsingHistoryIdFn: (id: string | null) => Promise<void>
  onSubmit: (params: any) => Promise<void>
}) => {
  return async () => {
    const isOk = validateBeforeSubmitFn()

    if (!isOk) {
      return
    }
    if (history.length > 0) {
      const lastMessage = history[history.length - 2]
      let newHistory = history.slice(0, -2)
      let mewMessages = messages
      mewMessages.pop()
      setHistory(newHistory)
      setMessages(mewMessages)
      await removeMessageUsingHistoryIdFn(historyId)
      if (lastMessage.role === "user") {
        const newController = new AbortController()
        await onSubmit({
          message: lastMessage.content,
          image: lastMessage.image || "",
          isRegenerate: true,
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
  messages: Message[]
  history: ChatHistory
  setMessages: (messages: Message[]) => void
  setHistory: (history: ChatHistory) => void
  historyId: string | null
  validateBeforeSubmitFn: () => boolean
  onSubmit: (params: any) => Promise<void>
}) => {
  return async (
    index: number,
    message: string,
    isHuman: boolean,
    isSend: boolean
  ) => {
    let newMessages = messages
    let newHistory = history

    // if human message and send then only trigger the submit
    if (isHuman && isSend) {
      const isOk = validateBeforeSubmitFn()

      if (!isOk) {
        return
      }

      const currentHumanMessage = newMessages[index]
      newMessages[index].message = message
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(historyId, index, message)
      await deleteChatForEdit(historyId, index)
      const abortController = new AbortController()
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController
      })
      return
    }
    newMessages[index].message = message
    setMessages(newMessages)
    newHistory[index].content = message
    setHistory(newHistory)
    await updateMessageByIndex(historyId, index, message)
  }
}

export const createBranchMessage = ({
  setMessages,
  setHistory,
  historyId,
  setHistoryId,
  setContext,
  setSelectedSystemPrompt,
  setSystemPrompt,
  serverChatId,
  setServerChatId,
  setServerChatState,
  setServerChatTopic,
  setServerChatClusterId,
  setServerChatSource,
  setServerChatExternalRef,
  serverChatState,
  serverChatTopic,
  serverChatClusterId,
  serverChatSource,
  serverChatExternalRef,
  messages,
  history
}: {
  setMessages: (messages: Message[]) => void
  setHistory: (history: ChatHistory) => void
  historyId: string | null
  setHistoryId: (id: string | null) => void
  setSelectedSystemPrompt?: (prompt: string) => void
  setSystemPrompt?: (prompt: string) => void
  setContext?: (context: UploadedFile[]) => void
  serverChatId?: string | null
  setServerChatId?: (id: string | null) => void
  setServerChatState?: (state: ConversationState | null) => void
  setServerChatTopic?: (topic: string | null) => void
  setServerChatClusterId?: (clusterId: string | null) => void
  setServerChatSource?: (source: string | null) => void
  setServerChatExternalRef?: (ref: string | null) => void
  serverChatState?: ConversationState | null
  serverChatTopic?: string | null
  serverChatClusterId?: string | null
  serverChatSource?: string | null
  serverChatExternalRef?: string | null
  messages?: Message[]
  history?: ChatHistory
}) => {
  return async (index: number) => {
    // When a server-backed character chat is active, create a new server chat
    // branched from the current context and mirror the prefix messages.
    if (serverChatId) {
      try {
        await tldwClient.initialize().catch(() => null)

        const chat = await tldwClient.getChat(serverChatId)
        const originalTitle = (chat?.title || "").trim() || "Extension chat"
        const shortId = String(serverChatId).slice(0, 8)
        const base =
          originalTitle.length > 60
            ? `${originalTitle.slice(0, 57)}…`
            : originalTitle
        const branchTitle = `${base} [${shortId}] · msg #${index + 1}`

        const characterId =
          (chat as any)?.character_id ?? (chat as any)?.characterId ?? null
        if (characterId == null) {
          notification.error({
            message: "Branch failed",
            description:
              "Unable to determine character for this server chat. Branching is only supported for character-backed chats."
          })
          return
        }

        const created = await tldwClient.createChat({
          title: branchTitle,
          character_id: characterId,
          parent_conversation_id: serverChatId,
          state: serverChatState || "in-progress",
          topic_label: serverChatTopic || undefined,
          cluster_id: serverChatClusterId || undefined,
          source: serverChatSource || undefined,
          external_ref: serverChatExternalRef || undefined
        })
        const rawId =
          (created as any)?.id ?? (created as any)?.chat_id ?? created
        const newChatId = rawId != null ? String(rawId) : ""
        if (!newChatId) {
          throw new Error("Failed to create server branch chat")
        }

        const snapshot: ChatHistory =
          (history && Array.isArray(history) ? history : []).slice(
            0,
            index + 1
          )

        for (const msg of snapshot) {
          const content = (msg.content || "").trim()
          if (!content) continue
          const role =
            msg.role === "system" ||
            msg.role === "assistant" ||
            msg.role === "user"
              ? msg.role
              : "user"
          await tldwClient.addChatMessage(newChatId, {
            role,
            content
          })
        }

        if (setServerChatId) {
          setServerChatId(newChatId)
        }
        if (setServerChatState) {
          setServerChatState(
            (created as any)?.state ??
              (created as any)?.conversation_state ??
              "in-progress"
          )
        }
        if (setServerChatTopic) {
          setServerChatTopic((created as any)?.topic_label ?? null)
        }
        if (setServerChatClusterId) {
          setServerChatClusterId((created as any)?.cluster_id ?? null)
        }
        if (setServerChatSource) {
          setServerChatSource((created as any)?.source ?? null)
        }
        if (setServerChatExternalRef) {
          setServerChatExternalRef((created as any)?.external_ref ?? null)
        }

        if (messages && messages.length > 0) {
          const slicedMessages = messages.slice(0, index + 1)
          setMessages(slicedMessages)
          if (history && history.length > 0) {
            setHistory(snapshot)
          }
        }
      } catch (e) {
        console.log("[branch] server branch failed", e)
        notification.error({
          message: "Branch failed",
          description:
            "Unable to create a branched server chat. Check your server connection and try again."
        })
      }
      return
    }

    // Local Dexie-backed branch (existing behavior)
    if (!historyId) {
      // No persisted history; nothing to branch from.
      return
    }

    try {
      const newBranch = await generateBranchMessage(historyId, index)
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
          if (prompt && setSelectedSystemPrompt) {
            setSelectedSystemPrompt(lastUsedPrompt.prompt_id)
          }
        }
        if (setSystemPrompt) {
          setSystemPrompt(lastUsedPrompt.prompt_content)
        }
      }
    } catch (e) {
      console.log("[branch] local branch failed", e)
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
