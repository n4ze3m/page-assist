import { saveHistory, saveMessage } from "@/db"
import { setLastUsedChatModel, setLastUsedChatSystemPrompt } from "@/services/model-settings"
import { generateTitle } from "@/services/title"
import { ChatHistory } from "@/store/option"

export const saveMessageOnError = async ({
  e,
  history,
  setHistory,
  image,
  userMessage,
  botMessage,
  historyId,
  selectedModel,
  setHistoryId,
  isRegenerating,
  message_source = "web-ui",
  message_type,
  prompt_content,
  prompt_id
}: {
  e: any
  setHistory: (history: ChatHistory) => void
  history: ChatHistory
  userMessage: string
  image: string
  botMessage: string
  historyId: string | null
  selectedModel: string
  setHistoryId: (historyId: string) => void
  isRegenerating: boolean
  message_source?: "copilot" | "web-ui"
  message_type?: string
  prompt_id?: string
  prompt_content?: string
}) => {
  if (
    e?.name === "AbortError" ||
    e?.message === "AbortError" ||
    e?.name?.includes("AbortError") ||
    e?.message?.includes("AbortError")
  ) {
    setHistory([
      ...history,
      {
        role: "user",
        content: userMessage,
        image
      },
      {
        role: "assistant",
        content: botMessage
      }
    ])

    if (historyId) {
      if (!isRegenerating) {
        await saveMessage(
          historyId,
          selectedModel,
          "user",
          userMessage,
          [image],
          [],
          1,
          message_type
        )
      }
      await saveMessage(
        historyId,
        selectedModel,
        "assistant",
        botMessage,
        [],
        [],
        2,
        message_type
      )
      await setLastUsedChatModel(historyId, selectedModel)
      if (prompt_id || prompt_content) {
        await setLastUsedChatSystemPrompt(historyId, { prompt_content, prompt_id })
      }
    } else {
      const title = await generateTitle(selectedModel, userMessage, userMessage)
      const newHistoryId = await saveHistory(title, false, message_source)
      if (!isRegenerating) {
        await saveMessage(
          newHistoryId.id,
          selectedModel,
          "user",
          userMessage,
          [image],
          [],
          1,
          message_type
        )
      }
      await saveMessage(
        newHistoryId.id,
        selectedModel,
        "assistant",
        botMessage,
        [],
        [],
        2,
        message_type
      )
      setHistoryId(newHistoryId.id)
      await setLastUsedChatModel(newHistoryId.id, selectedModel)
      if (prompt_id || prompt_content) {
        await setLastUsedChatSystemPrompt(newHistoryId.id, { prompt_content, prompt_id })
      }
    }

    return true
  }

  return false
}

export const saveMessageOnSuccess = async ({
  historyId,
  setHistoryId,
  isRegenerate,
  selectedModel,
  message,
  image,
  fullText,
  source,
  message_source = "web-ui",
  message_type, generationInfo,
  prompt_id,
  prompt_content
}: {
  historyId: string | null
  setHistoryId: (historyId: string) => void
  isRegenerate: boolean
  selectedModel: string | null
  message: string
  image: string
  fullText: string
  source: any[]
  message_source?: "copilot" | "web-ui",
  message_type?: string
  generationInfo?: any
  prompt_id?: string
  prompt_content?: string
}) => {
  if (historyId) {
    if (!isRegenerate) {
      await saveMessage(
        historyId,
        selectedModel,
        "user",
        message,
        [image],
        [],
        1,
        message_type,
        generationInfo
      )
    }
    await saveMessage(
      historyId,
      selectedModel!,
      "assistant",
      fullText,
      [],
      source,
      2,
      message_type,
      generationInfo
    )
    await setLastUsedChatModel(historyId, selectedModel!)
    if (prompt_id || prompt_content) {
      await setLastUsedChatSystemPrompt(historyId, { prompt_content, prompt_id })
    }
  } else {
    const title = await generateTitle(selectedModel, message, message)
    const newHistoryId = await saveHistory(title, false, message_source)
    await saveMessage(
      newHistoryId.id,
      selectedModel,
      "user",
      message,
      [image],
      [],
      1,
      message_type,
      generationInfo
    )
    await saveMessage(
      newHistoryId.id,
      selectedModel!,
      "assistant",
      fullText,
      [],
      source,
      2,
      message_type,
      generationInfo
    )
    setHistoryId(newHistoryId.id)
    await setLastUsedChatModel(newHistoryId.id, selectedModel!)
    if (prompt_id || prompt_content) {
      await setLastUsedChatSystemPrompt(newHistoryId.id, { prompt_content, prompt_id })
    }
  }
}
