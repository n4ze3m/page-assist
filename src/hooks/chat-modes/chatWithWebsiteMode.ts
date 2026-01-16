import { cleanUrl } from "~/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  getOllamaURL,
  promptForRag
} from "~/services/ollama"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { type ChatHistory, type Message } from "~/store/option"
import { generateID } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { removeReasoning } from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { formatDocs } from "@/chain/chat-with-x"
import { getNoOfRetrievedDocs } from "@/services/app"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { PAMemoryVectorStore } from "@/libs/PAMemoryVectorStore"
import { getContentFromCurrentTab } from "~/libs/get-html"
import { memoryEmbedding } from "@/utils/memory-embeddings"
import {CURSOR, streamChatResponse, type StreamConfig} from "./sharedStreaming"
import { STREAM_REVEAL } from "../streamingConfig"

export const chatWithWebsiteMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  embeddingSignal: AbortSignal,
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
    setEmbeddingController,
    setIsEmbedding,
    historyId,
    setHistoryId,
    chatWithWebsiteEmbedding,
    maxWebsiteContext,
    currentURL,
    setCurrentURL,
    keepTrackOfEmbedding,
    setKeepTrackOfEmbedding,
    currentChatModelSettings,
    temporaryChat
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
    setEmbeddingController: (controller: AbortController | null) => void
    setIsEmbedding: (value: boolean) => void
    historyId: string | null
    setHistoryId: (id: string) => void
    chatWithWebsiteEmbedding: boolean
    maxWebsiteContext: number
    currentURL: string
    setCurrentURL: (url: string) => void
    keepTrackOfEmbedding: { [key: string]: PAMemoryVectorStore }
    setKeepTrackOfEmbedding: React.Dispatch<
      React.SetStateAction<{ [key: string]: PAMemoryVectorStore }>
    >
    currentChatModelSettings: any
    temporaryChat: boolean
  }
) => {
  const url = await getOllamaURL()
  const userDefaultModelSettings = await getAllDefaultModelSettings()

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  let generateMessageId = generateID()
  const modelInfo = await getModelNicknameByID(selectedModel)

  let newMessage: Message[] = []
  if (!isRegenerate) {
    newMessage = [
      ...messages,
      {
        isBot: false,
        name: "You",
        message,
        sources: [],
        images: []
      },
      {
        isBot: true,
        name: selectedModel,
        message: "",
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
        name: selectedModel,
        message: "",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  }

  setMessages(newMessage)

  let embedURL: string, embedHTML: string, embedType: string
  let embedPDF: { content: string; page: number }[] = []

  let isAlreadyExistEmbedding: PAMemoryVectorStore
  const {
    content: html,
    url: websiteUrl,
    type,
    pdf
  } = await getContentFromCurrentTab(chatWithWebsiteEmbedding)

  embedHTML = html
  embedURL = websiteUrl
  embedType = type
  embedPDF = pdf
  if (messages.length === 0) {
    setCurrentURL(websiteUrl)
    // Use the freshly detected websiteUrl instead of stale currentURL state
    isAlreadyExistEmbedding = keepTrackOfEmbedding[websiteUrl]
  } else {
    if (currentURL !== websiteUrl) {
      setCurrentURL(websiteUrl)
    } else {
      embedURL = currentURL
    }
    isAlreadyExistEmbedding = keepTrackOfEmbedding[websiteUrl]
  }
  setMessages(newMessage)
  const ollamaUrl = await getOllamaURL()
  const embeddingModle = await defaultEmbeddingModelForRag()

  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModle || selectedModel,
    baseUrl: cleanUrl(ollamaUrl),
    signal: embeddingSignal,
    keepAlive:
      currentChatModelSettings?.keepAlive ?? userDefaultModelSettings?.keepAlive
  })
  let vectorstore: PAMemoryVectorStore

  try {
    if (isAlreadyExistEmbedding) {
      vectorstore = isAlreadyExistEmbedding
    } else {
      if (chatWithWebsiteEmbedding) {
        vectorstore = await memoryEmbedding({
          html: embedHTML,
          keepTrackOfEmbedding: keepTrackOfEmbedding,
          ollamaEmbedding: ollamaEmbedding,
          pdf: embedPDF,
          setIsEmbedding: setIsEmbedding,
          setKeepTrackOfEmbedding: setKeepTrackOfEmbedding,
          type: embedType,
          url: embedURL
        })
      }
    }
    let query = message
    const { ragPrompt: systemPrompt, ragQuestionPrompt: questionPrompt } =
      await promptForRag()
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

    let context: string = ""
    let source: any[] = []

    if (chatWithWebsiteEmbedding) {
      const docSize = await getNoOfRetrievedDocs()

      const docs = await vectorstore.similaritySearch(query, docSize)
      context = formatDocs(docs)
      source = docs.map((doc) => {
        return {
          ...doc,
          name: doc?.metadata?.source || "untitled",
          type: doc?.metadata?.type || "unknown",
          mode: "chat",
          url: ""
        }
      })
    } else {
      if (type === "html") {
        context = embedHTML.slice(0, maxWebsiteContext)
      } else {
        context = embedPDF
          .map((pdf) => pdf.content)
          .join(" ")
          .slice(0, maxWebsiteContext)
      }

      source = [
        {
          name: embedURL,
          type: type,
          mode: "chat",
          url: embedURL,
          pageContent: context,
          metadata: {
            source: embedURL,
            url: embedURL
          }
        }
      ]
    }

    let humanMessage = await humanMessageFormatter({
      content: [
        {
          text: systemPrompt
            .replace("{context}", context)
            .replace("{question}", query),
          type: "text"
        }
      ],
      model: selectedModel,
      useOCR
    })

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
        message_source: "copilot",
        generationInfo,
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
        message_source: "copilot"
      })

      if (!errorSave) {
        throw e
      }
      setIsProcessing(false)
      setStreaming(false)
      setIsEmbedding(false)
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
      sources: source,
      documents: [],
      messageType: ""
    })
  } catch (e) {
    console.log(e)
    const errorSave = await saveMessageOnError({
      e,
      botMessage: "",
      history,
      historyId,
      image,
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
    setIsEmbedding(false)
  } finally {
    setAbortController(null)
    setEmbeddingController(null)
  }
}
