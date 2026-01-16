import { cleanUrl } from "~/libs/clean-url"
import { getOllamaURL, systemPromptForNonRagOption } from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { getPromptById } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { systemPromptFormatter } from "@/utils/system-message"
import {CURSOR, streamChatResponse, type StreamConfig} from "./sharedStreaming"

export const normalChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  {
    selectedModel,
    useOCR,
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
    setHistoryId,
    uploadedFiles
  }: {
    selectedModel: string
    useOCR: boolean
    selectedSystemPrompt: string
    currentChatModelSettings: any
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
    uploadedFiles?: any[]
  }
) => {
  console.log("Using normalChatMode")
  const url = await getOllamaURL()
  let promptId: string | undefined = selectedSystemPrompt
  let promptContent: string | undefined = undefined

  if (image.length > 0) {
    image = `data:image/jpeg;base64,${image.split(",")[1]}`
  }

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  const prompt = await systemPromptForNonRagOption()
  const selectedPrompt = await getPromptById(selectedSystemPrompt)

  let humanMessage = await humanMessageFormatter({
    content: [
      {
        text: message,
        type: "text"
      }
    ],
    model: selectedModel,
    useOCR: useOCR
  })
  if (image.length > 0) {
    humanMessage = await humanMessageFormatter({
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
      useOCR: useOCR
    })
  }

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
        image
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
      generationInfo,
      prompt_content: promptContent,
      prompt_id: promptId,
      reasoning_time_taken: timetaken
    })

    setIsProcessing(false)
    setStreaming(false)
  }

  const onError = async (e: any, fullText: string) => {
    console.log(e)

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
      prompt_content: promptContent,
      prompt_id: promptId
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
    image,
    sources: [],
    documents:
      uploadedFiles?.map((f) => ({
        type: "file",
        filename: f.filename,
        fileSize: f.size,
        processed: f.processed
      })) || [],
    messageType: ""
  })
}
