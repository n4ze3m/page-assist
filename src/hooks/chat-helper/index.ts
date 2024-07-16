import { saveHistory, saveMessage } from "@/db"
import { setLastUsedChatModel } from "@/services/model-settings"
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
  message_source = "web-ui"
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
          1
        )
      }
      await saveMessage(
        historyId,
        selectedModel,
        "assistant",
        botMessage,
        [],
        [],
        2
      )
      await setLastUsedChatModel(historyId, selectedModel)
    } else {
      const newHistoryId = await saveHistory(userMessage, false, message_source)
      if (!isRegenerating) {
        await saveMessage(
          newHistoryId.id,
          selectedModel,
          "user",
          userMessage,
          [image],
          [],
          1
        )
      }
      await saveMessage(
        newHistoryId.id,
        selectedModel,
        "assistant",
        botMessage,
        [],
        [],
        2
      )
      setHistoryId(newHistoryId.id)
      await setLastUsedChatModel(newHistoryId.id, selectedModel)
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
  message_source = "web-ui"
}: {
  historyId: string | null
  setHistoryId: (historyId: string) => void
  isRegenerate: boolean
  selectedModel: string | null
  message: string
  image: string
  fullText: string
  source: any[]
  message_source?: "copilot" | "web-ui"
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
        1
      )
    }
    await saveMessage(
      historyId,
      selectedModel!,
      "assistant",
      fullText,
      [],
      source,
      2
    )
    await setLastUsedChatModel(historyId, selectedModel!)
  } else {
    const newHistoryId = await saveHistory(message, false, message_source)
    await saveMessage(
      newHistoryId.id,
      selectedModel,
      "user",
      message,
      [image],
      [],
      1
    )
    await saveMessage(
      newHistoryId.id,
      selectedModel!,
      "assistant",
      fullText,
      [],
      source,
      2
    )
    setHistoryId(newHistoryId.id)
    await setLastUsedChatModel(newHistoryId.id, selectedModel!)
  }
}
