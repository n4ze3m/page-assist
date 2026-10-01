import { cleanUrl } from "@/libs/clean-url"
import { geWebSearchFollowUpPrompt, getOllamaURL } from "@/services/ai/ollama"
import { type ChatHistory, type Message } from "@/store/option"
import { generateID } from "@/db/dexie/helpers"
import { getSystemPromptForWeb, isQueryHaveWebsite } from "@/web/web"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { removeReasoning } from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import {
  CURSOR,
  streamChatResponse,
  type StreamConfig
} from "./sharedStreaming"
import { STREAM_REVEAL } from "../streamingConfig"

export const searchChatMode = async (
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
    setIsSearchingInternet,
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
    setIsSearchingInternet: (value: boolean) => void
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
  console.log("Using searchChatMode")
  const url = await getOllamaURL()
  if (image.length > 0 && !image.startsWith("data:")) {
    image = `data:image/jpeg;base64,${image.split(",")[1]}`
  }

  const imagesToSave = images?.length > 0 ? images : image ? [image] : []

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  let newMessage: Message[] = []
  let generateMessageId = generateID()

  const modelInfo = await getModelNicknameByID(selectedModel)
  if (!isRegenerate) {
    newMessage = [
      ...messages,
      {
        isBot: false,
        createdAt: Date.now(),
        name: "You",
        message,
        sources: [],
        images: imagesToSave
      },
      {
        isBot: true,
        createdAt: Date.now(),
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
      ...messages,
      {
        isBot: true,
        createdAt: Date.now(),
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
  let source: any[] = []

  try {
    setIsSearchingInternet(true)

    let query = message

    let questionPrompt = await geWebSearchFollowUpPrompt()
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
    const questionModel = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url)
    })

    let questionMessage = await humanMessageFormatter({
      content: [
        {
          text: promptForQuestion,
          type: "text"
        }
      ],
      model: selectedModel,
      useOCR: useOCR
    })

    if (imagesToSave.length > 0) {
      questionMessage = await humanMessageFormatter({
        content: [
          {
            text: promptForQuestion,
            type: "text"
          },
          ...imagesToSave.map((image_url) => ({
            image_url,
            type: "image_url" as const
          }))
        ],
        model: selectedModel,
        useOCR: useOCR
      })
    }
    try {
      const isWebQuery = await isQueryHaveWebsite(query)
      if (!isWebQuery) {
        const response = await questionModel.invoke([questionMessage])
        query = response?.content?.toString() || message
        query = removeReasoning(query)
      }
    } catch (error) {
      console.error("Error in questionModel.invoke:", error)
    }
    // }

    const { prompt, source: webSource } = await getSystemPromptForWeb(query)
    source = webSource
    setIsSearchingInternet(false)

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
    if (imagesToSave.length > 0) {
      humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: "text"
          },
          ...imagesToSave.map((image_url) => ({
            image_url,
            type: "image_url" as const
          }))
        ],
        model: selectedModel,
        useOCR: useOCR
      })
    }

    const applicationChatHistory = await generateHistory(history, selectedModel)

    if (prompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: prompt
        })
      )
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
      setHistory([
        ...history,
        {
          role: "user",
          createdAt: Date.now(),
          content: message,
          images: imagesToSave,
          image
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
        source,
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
        isRegenerating: isRegenerate
      })

      if (!errorSave) {
        throw e // Re-throw to be handled by the calling function
      }
      setIsProcessing(false)
      setStreaming(false)
    }

    setStreaming(true)
    setIsProcessing(true)

    await streamChatResponse({
      ollama,
      applicationChatHistory,
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
      sources: source,
      messageType: ""
    })
  } catch (e) {
    setIsProcessing(false)
    setStreaming(false)
    throw e
  } finally {
    setAbortController(null)
  }
}
