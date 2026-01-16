import { cleanUrl } from "~/libs/clean-url"
import { getOllamaURL, systemPromptForNonRag } from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { generateID } from "@/db/dexie/helpers"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { systemPromptFormatter } from "@/utils/system-message"
import {CURSOR, streamChatResponse, type StreamConfig} from "./sharedStreaming"
import { STREAM_REVEAL } from "../streamingConfig"

export const visionChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  {
    selectedModel,
    useOCR,
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
    useOCR: boolean
    setMessages: (
      messages: Message[] | ((prev: Message[]) => Message[])
    ) => void
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
  console.log("Using visionChatMode")
  const url = await getOllamaURL()

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  const prompt = await systemPromptForNonRag()

  let humanMessage = await humanMessageFormatter({
    content: [
      {
        text: message,
        type: "text"
      },
      {
        image_url: image,
        type: "image_url"
      }
    ],
    model: selectedModel,
    useOCR
  })

  const applicationChatHistory = generateHistory(history, selectedModel)

  if (prompt) {
    applicationChatHistory.unshift(
      await systemPromptFormatter({
        content: prompt
      })
    )
  }

  const config: StreamConfig = {
    cursor: CURSOR,
    reveal: STREAM_REVEAL
  }

  const onComplete = async (
    fullText: string,
    generationInfo?: any,
    timetaken?: number
  ) => {
    setHistory([
      ...history,
      {
        role: "user",
        content: message,
        image: ""
      },
      {
        role: "assistant",
        content: fullText
      }
    ])

    await saveMessageOnSuccess({
      historyId,
      setHistoryId,
      isRegenerate,
      selectedModel: selectedModel,
      message,
      image: "",
      fullText,
      source: [],
      message_source: "copilot",
      generationInfo,
      reasoning_time_taken: timetaken
    })

    setIsProcessing(false)
    setStreaming(false)
  }

  const onError = async (e: any, fullText: string) => {
    const errorSave = await saveMessageOnError({
      e,
      botMessage: fullText,
      history,
      historyId,
      image: "",
      selectedModel,
      setHistory,
      setHistoryId,
      userMessage: message,
      isRegenerating: isRegenerate,
      message_source: "copilot"
    })

    if (!errorSave) {
      throw e
    }
    setIsProcessing(false)
    setStreaming(false)
  }

  await streamChatResponse({
    ollama,
    applicationChatHistory,
    humanMessage,
    selectedModel,
    messages,
    isRegenerate,
    signal,
    config,
    setMessages,
    onComplete,
    onError,
    image: "",
    sources: [],
    documents: [],
    messageType: ""
  })
}
