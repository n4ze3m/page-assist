import { cleanUrl } from "@/libs/clean-url"
import { getOllamaURL, promptForRag } from "@/services/ai/ollama"
import { type ChatHistory, type Message } from "@/store/option"
import { generateID } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { removeReasoning } from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { ChatDocuments } from "@/models/ChatTypes"
import { getTabContents } from "@/libs/get-tab-contents"
import {
  CURSOR,
  streamChatResponse,
  type StreamConfig
} from "./sharedStreaming"
import { STREAM_REVEAL } from "../streamingConfig"

export const tabChatMode = async (
  message: string,
  image: string,
  documents: ChatDocuments,
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
    setHistoryId
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
  }
) => {
  console.log("Using tabChatMode")
  const url = await getOllamaURL()

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  const modelInfo = await getModelNicknameByID(selectedModel)
  let generateMessageId = generateID()
  let newMessage: Message[] = [...messages]

  if (!isRegenerate) {
    newMessage = [
      ...newMessage,
      {
        isBot: false,
        name: "You",
        message,
        sources: [],
        images: [image],
        documents
      },
      {
        isBot: true,
        name: selectedModel,
        message: "▋",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  } else {
    newMessage = [
      ...newMessage,
      {
        isBot: true,
        name: selectedModel,
        message: "▋",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  }
  setMessages(newMessage)

  let query = message
  const { ragPrompt: systemPrompt, ragQuestionPrompt: questionPrompt } =
    await promptForRag()
  let context = await getTabContents(documents)

  let humanMessage = await humanMessageFormatter({
    content: [
      {
        text: systemPrompt
          .replace("{context}", context)
          .replace("{question}", message),
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
  // console.log(context)
  if (newMessage.length > 2) {
    const lastTenMessages = newMessage.slice(-10)
    lastTenMessages.pop()
    const chat_history = lastTenMessages
      .map((message) => {
        return `${message.isBot ? "Assistant: " : "Human: "}${message.message}`
      })
      .join("\n")
    const promptForQuestion = questionPrompt
      .replaceAll("{chat_history}", chat_history)
      .replaceAll("{question}", message)
    const questionOllama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url)
    })
    const response = await questionOllama.invoke(promptForQuestion)
    query = response.content.toString()
    query = removeReasoning(query)
  }
  let source: any[] = []

  const applicationChatHistory = generateHistory(history, selectedModel)

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
      source,
      generationInfo,
      reasoning_time_taken: timetaken,
      documents
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
      documents
    })

    if (!errorSave) {
      throw e // Re-throw to be handled by the calling function
    }
    setIsProcessing(false)
    setStreaming(false)
  }

  await streamChatResponse({
    ollama,
    applicationChatHistory,
    humanMessage,
    userMessage: message,
    selectedModel,
    messages: newMessage,
    isRegenerate,
    signal,
    config,
    setMessages,
    onComplete,
    onError,
    image,
    sources: source,
    documents,
    messageType: ""
  })
}
