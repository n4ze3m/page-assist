import { cleanUrl } from "~/libs/clean-url"
import { getOllamaURL } from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { generateID } from "@/db/dexie/helpers"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { getPrompt } from "@/services/application"
import {CURSOR, streamChatResponse, type StreamConfig} from "./sharedStreaming"
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
  console.log("Using presetChatMode")
  const url = await getOllamaURL()

  if (image.length > 0) {
    image = `data:image/jpeg;base64,${image.split(",")[1]}`
  }

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
  if (image.length > 0) {
    humanMessage = await humanMessageFormatter({
      content: [
        {
          text: prompt.replace("{text}", message),
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
        image,
        messageType
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
      image,
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
    selectedModel,
    messages,
    isRegenerate,
    signal,
    config,
    setMessages,
    onComplete,
    onError,
    image,
    sources: [],
    documents: [],
    messageType
  })
}
