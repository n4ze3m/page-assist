import { saveHistory, saveMessage } from "@/db"
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
  isRegenerating
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
    } else {
      const newHistoryId = await saveHistory(userMessage)
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
  source
}: {
  historyId: string | null
  setHistoryId: (historyId: string) => void
  isRegenerate: boolean
  selectedModel: string | null
  message: string
  image: string
  fullText: string
  source: any[]
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
  } else {
    const newHistoryId = await saveHistory(message)
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
  }
}
