import { getLastChatHistory, saveHistory, saveMessage, updateHistory, updateMessage } from "@/db"
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
  prompt_id,
  isContinue,
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
  isContinue?: boolean
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
      if (!isRegenerating && !isContinue) {
        await saveMessage(
          {
            history_id: historyId,
            name: selectedModel,
            role: "user",
            content: userMessage,
            images: [image],
            time: 1,
            message_type,
          }
        )
      }


      if (isContinue) {
        console.log("Saving Last Message")
        const lastMessage = await getLastChatHistory(historyId)
        await updateMessage(
          historyId,
          lastMessage.id,
          botMessage
        )
      } else {

        await saveMessage(
          {
            history_id: historyId,
            name: selectedModel,
            role: "assistant",
            content: botMessage,
            images: [],
            source: [],
            time: 2,
            message_type,
          }
        )
      }
      await setLastUsedChatModel(historyId, selectedModel)
      if (prompt_id || prompt_content) {
        await setLastUsedChatSystemPrompt(historyId, { prompt_content, prompt_id })
      }
    } else {
      const title = await generateTitle(selectedModel, userMessage, userMessage)
      const newHistoryId = await saveHistory(title, false, message_source)
      if (!isRegenerating) {

        await saveMessage(
          {
            history_id: newHistoryId.id,
            name: selectedModel,
            role: "user",
            content: userMessage,
            images: [image],
            time: 1,
            message_type,
          }
        )
      }



      await saveMessage(
        {
          history_id: newHistoryId.id,
          name: selectedModel,
          role: "assistant",
          content: botMessage,
          images: [],
          source: [],
          time: 2,
          message_type,
        }
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
  prompt_content,
  reasoning_time_taken = 0,
  isContinue,
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
  reasoning_time_taken?: number
  isContinue?: boolean,
}) => {
  if (historyId) {
    if (!isRegenerate && !isContinue) {

      await saveMessage(
        {
          history_id: historyId,
          name: selectedModel,
          role: "user",
          content: message,
          images: [image],
          time: 1,
          message_type,
          generationInfo,
          reasoning_time_taken
        }
      )
    }


    if (isContinue) {
      console.log("Saving Last Message")
      const lastMessage = await getLastChatHistory(historyId)
      console.log("lastMessage", lastMessage)
      await updateMessage(
        historyId,
        lastMessage.id,
        fullText
      )
    } else {
      await saveMessage(
        {
          history_id: historyId,
          name: selectedModel,
          role: "assistant",
          content: fullText,
          images: [],
          source,
          time: 2,
          message_type,
          generationInfo,
          reasoning_time_taken
        }
        // historyId,
        // selectedModel!,
        // "assistant",
        // fullText,
        // [],
        // source,
        // 2,
        // message_type,
        // generationInfo,
        // reasoning_time_taken
      )
    }

    await setLastUsedChatModel(historyId, selectedModel!)
    if (prompt_id || prompt_content) {
      await setLastUsedChatSystemPrompt(historyId, { prompt_content, prompt_id })
    }
  } else {
    const title = await generateTitle(selectedModel, message, message)
    const newHistoryId = await saveHistory(title, false, message_source)


    await saveMessage(
      {
        history_id: newHistoryId.id,
        name: selectedModel,
        role: "user",
        content: message,
        images: [image],
        time: 1,
        message_type,
        generationInfo,
        reasoning_time_taken
      }
      // newHistoryId.id,
      // selectedModel,
      // "user",
      // message,
      // [image],
      // [],
      // 1,
      // message_type,
      // generationInfo,
      // reasoning_time_taken
    )


    await saveMessage(
      {
        history_id: newHistoryId.id,
        name: selectedModel,
        role: "assistant",
        content: fullText,
        images: [],
        source,
        time: 2,
        message_type,
        generationInfo,
        reasoning_time_taken
      }
      // newHistoryId.id,
      // selectedModel!,
      // "assistant",
      // fullText,
      // [],
      // source,
      // 2,
      // message_type,
      // generationInfo,
      // reasoning_time_taken
    )
    setHistoryId(newHistoryId.id)
    await setLastUsedChatModel(newHistoryId.id, selectedModel!)
    if (prompt_id || prompt_content) {
      await setLastUsedChatSystemPrompt(newHistoryId.id, { prompt_content, prompt_id })
    }
  }
}
