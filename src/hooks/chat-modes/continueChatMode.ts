import { cleanUrl } from "@/libs/clean-url"
import { getOllamaURL, systemPromptForNonRagOption } from "@/services/ai/ollama"
import { type ChatHistory, type Message } from "@/store/option"
import { getPromptById } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { systemPromptFormatter } from "@/utils/system-message"
import {CURSOR, streamChatResponse, type StreamConfig} from "./sharedStreaming"
import { STREAM_REVEAL } from "../streamingConfig"

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
  console.log("Using continueChatMode")
  const url = await getOllamaURL()
  let promptId: string | undefined = selectedSystemPrompt
  let promptContent: string | undefined = undefined

  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || !lastMessage.id) {
    throw new Error("No last message to continue")
  }

  const initialFullText = lastMessage.message.replace(/▋$/, "") // Remove cursor if present

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

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

  const config = {
    cursor: CURSOR,
    reveal: STREAM_REVEAL
  }

  const onComplete = async (
    fullText: string,
    generationInfo?: any,
    timetaken?: number
  ) => {
    // Update last history entry
    const newHistory = [...history]
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
      userMessage: "",
      isRegenerating: false,
      isContinue: true,
      prompt_content: promptContent,
      prompt_id: promptId
    })

    if (!errorSave) {
      throw e
    }
    setIsProcessing(false)
    setStreaming(false)
  }

  setStreaming(true)
  setIsProcessing(true)

  await streamChatResponse({
    ollama,
    applicationChatHistory,
    selectedModel,
    messages,
    isRegenerate: false,
    isContinue: true,
    botMessageId: lastMessage.id,
    initialFullText,
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
