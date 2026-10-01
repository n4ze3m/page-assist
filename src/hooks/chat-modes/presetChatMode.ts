import { cleanUrl } from "@/libs/clean-url"
import { getOllamaURL } from "@/services/ai/ollama"
import { type ChatHistory, type Message } from "@/store/option"
import { generateID } from "@/db/dexie/helpers"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { getPrompt } from "@/services/browser/application"
import {
  CURSOR,
  streamChatResponse,
  type StreamConfig
} from "./sharedStreaming"
import { STREAM_REVEAL } from "../streamingConfig"

export const presetChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  messageType: string,
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
    setHistoryId,
    images
  }: {
    images?: string[]
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
  console.log("Using presetChatMode")
  const url = await getOllamaURL()

  if (image.length > 0 && !image.startsWith("data:")) {
    image = `data:image/jpeg;base64,${image.split(",")[1]}`
  }

  const imagesToSave = images?.length > 0 ? images : image ? [image] : []

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  const prompt = await getPrompt(messageType)

  let humanMessage = await humanMessageFormatter({
    content: [
      {
        text: prompt.replace("{text}", message),
        type: "text"
      }
    ],
    model: selectedModel,
    useOCR
  })
  if (imagesToSave.length > 0) {
    humanMessage = await humanMessageFormatter({
      content: [
        {
          text: prompt.replace("{text}", message),
          type: "text"
        },
        ...imagesToSave.map((image_url) => ({
          image_url,
          type: "image_url" as const
        }))
      ],
      model: selectedModel,
      useOCR
    })
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
        createdAt: Date.now(),
        content: message,
        image,
        images: imagesToSave,
        messageType
      },
      {
        role: "assistant",
        createdAt: Date.now(),
        content: fullText
      }
    ])

    await saveMessageOnSuccess({
      historyId,
      setHistoryId,
      isRegenerate,
      selectedModel: selectedModel,
      message,
      image,
      images: imagesToSave,
      fullText,
      source: [],
      message_source: "copilot",
      message_type: messageType,
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
      image,
      images: imagesToSave,
      selectedModel,
      setHistory,
      setHistoryId,
      userMessage: message,
      isRegenerating: isRegenerate,
      message_source: "copilot",
      message_type: messageType
    })

    if (!errorSave) {
      throw e
    }
    setIsProcessing(false)
    setStreaming(false)
  }

  await streamChatResponse({
    ollama,
    applicationChatHistory: [], // No history for preset, just humanMessage
    humanMessage,
    userMessage: message,
    selectedModel,
    messages,
    isRegenerate,
    signal,
    config,
    setMessages,
    onComplete,
    onError,
    image,
    images: imagesToSave,
    sources: [],
    documents: [],
    messageType
  })
}
