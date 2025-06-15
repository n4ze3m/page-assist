import { cleanUrl } from "~/libs/clean-url"
import {
  getOllamaURL,
  systemPromptForNonRagOption
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { getPromptById } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent
} from "@/libs/reasoning"
import { systemPromptFormatter } from "@/utils/system-message"

export const continueChatMode = async (
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  {
    selectedModel,
    selectedSystemPrompt,
    currentChatModelSettings,
    setMessages,
    saveMessageOnSuccess,
    saveMessageOnError,
    setHistory,
    setIsProcessing,
    setStreaming,
    setAbortController,
    historyId,
    setHistoryId
  }: {
    selectedModel: string
    selectedSystemPrompt: string
    currentChatModelSettings: any
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
    saveMessageOnSuccess: (data: any) => Promise<string | null>
    saveMessageOnError: (data: any) => Promise<string | null>
    setHistory: (history: ChatHistory) => void
    setIsProcessing: (value: boolean) => void
    setStreaming: (value: boolean) => void
    setAbortController: (controller: AbortController | null) => void
    historyId: string | null
    setHistoryId: (id: string) => void
  }
) => {
  console.log("Using continueChatMode")
  const url = await getOllamaURL()
  let promptId: string | undefined = selectedSystemPrompt
  let promptContent: string | undefined = undefined

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  let newMessage: Message[] = []

  const lastMessage = messages[messages.length - 1]
  let generateMessageId = lastMessage.id
  newMessage = [...messages]
  newMessage[newMessage.length - 1] = {
    ...lastMessage,
    message: lastMessage.message + "▋"
  }
  setMessages(newMessage)
  let fullText = lastMessage.message
  let contentToSave = ""
  let timetaken = 0

  try {
    const prompt = await systemPromptForNonRagOption()
    const selectedPrompt = await getPromptById(selectedSystemPrompt)

    const applicationChatHistory = generateHistory(history, selectedModel)

    if (prompt && !selectedPrompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: prompt
        })
      )
    }

    const isTempSystemprompt =
      currentChatModelSettings.systemPrompt &&
      currentChatModelSettings.systemPrompt?.trim().length > 0

    if (!isTempSystemprompt && selectedPrompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: selectedPrompt.content
        })
      )
      promptContent = selectedPrompt.content
    }

    if (isTempSystemprompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: currentChatModelSettings.systemPrompt
        })
      )
      promptContent = currentChatModelSettings.systemPrompt
    }

    let generationInfo: any | undefined = undefined

    const chunks = await ollama.stream([...applicationChatHistory], {
      signal: signal,
      callbacks: [
        {
          handleLLMEnd(output: any): any {
            try {
              generationInfo = output?.generations?.[0][0]?.generationInfo
            } catch (e) {
              console.error("handleLLMEnd error", e)
            }
          }
        }
      ]
    })

    let count = 0
    let reasoningStartTime: Date | null = null
    let reasoningEndTime: Date | null = null
    let apiReasoning: boolean = false
    for await (const chunk of chunks) {
      if (chunk?.additional_kwargs?.reasoning_content) {
        const reasoningContent = mergeReasoningContent(
          fullText,
          chunk?.additional_kwargs?.reasoning_content || ""
        )
        contentToSave = reasoningContent
        fullText = reasoningContent
        apiReasoning = true
      } else {
        if (apiReasoning) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
        }
      }

      contentToSave += chunk?.content
      fullText += chunk?.content

      if (isReasoningStarted(fullText) && !reasoningStartTime) {
        reasoningStartTime = new Date()
      }

      if (
        reasoningStartTime &&
        !reasoningEndTime &&
        isReasoningEnded(fullText)
      ) {
        reasoningEndTime = new Date()
        const reasoningTime =
          reasoningEndTime.getTime() - reasoningStartTime.getTime()
        timetaken = reasoningTime
      }

      if (count === 0) {
        setIsProcessing(true)
      }

      setMessages((prev) => {
        return prev.map((message) => {
          if (message.id === generateMessageId) {
            return {
              ...message,
              message: fullText + "▋",
              reasoning_time_taken: timetaken
            }
          }
          return message
        })
      })
      count++
    }

    setMessages((prev) => {
      return prev.map((message) => {
        if (message.id === generateMessageId) {
          return {
            ...message,
            message: fullText,
            generationInfo,
            reasoning_time_taken: timetaken
          }
        }
        return message
      })
    })

    let newHistory = [...history]

    newHistory[newHistory.length - 1] = {
      ...newHistory[newHistory.length - 1],
      content: fullText
    }
    setHistory(newHistory)
    await saveMessageOnSuccess({
      historyId,
      setHistoryId,
      isRegenerate: false,
      selectedModel: selectedModel,
      message: "",
      image: "",
      fullText,
      source: [],
      generationInfo,
      prompt_content: promptContent,
      prompt_id: promptId,
      reasoning_time_taken: timetaken,
      isContinue: true
    })

    setIsProcessing(false)
    setStreaming(false)
  } catch (e) {
    const errorSave = await saveMessageOnError({
      e,
      botMessage: fullText,
      history,
      historyId,
      image: "",
      selectedModel,
      setHistory,
      setHistoryId,
      userMessage: "",
      isRegenerating: false,
      isContinue: true,
      prompt_content: promptContent,
      prompt_id: promptId
    })

    if (!errorSave) {
      throw e // Re-throw to be handled by the calling function
    }
    setIsProcessing(false)
    setStreaming(false)
  } finally {
    setAbortController(null)
  }
}
