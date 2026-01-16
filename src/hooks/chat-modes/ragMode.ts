import { cleanUrl } from "~/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  getOllamaURL,
  promptForRag
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { generateID } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import { removeReasoning } from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"
import { formatDocs } from "@/chain/chat-with-x"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { getNoOfRetrievedDocs } from "@/services/app"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { isChatWithWebsiteEnabled } from "@/services/kb"
import { getKnowledgeById } from "@/db/dexie/knowledge"
import {CURSOR, streamChatResponse, type StreamConfig} from "./sharedStreaming"

export const ragMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  {
    selectedModel,
    useOCR,
    selectedKnowledge,
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
    selectedKnowledge: any
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
  console.log("Using ragMode")
  const url = await getOllamaURL()
  const userDefaultModelSettings = await getAllDefaultModelSettings()

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  const embeddingModle = await defaultEmbeddingModelForRag()
  const ollamaUrl = await getOllamaURL()
  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModle || selectedModel,
    baseUrl: cleanUrl(ollamaUrl),
    keepAlive:
      currentChatModelSettings?.keepAlive ?? userDefaultModelSettings?.keepAlive
  })

  const kbInfo = await getKnowledgeById(selectedKnowledge.id)

  let vectorstore = await PageAssistVectorStore.fromExistingIndex(
    ollamaEmbedding,
    {
      file_id: null,
      knownledge_id: selectedKnowledge.id
    }
  )
  let source: any[] = []
  let context: string = ""
  let query = message
  let { ragPrompt: systemPrompt, ragQuestionPrompt: questionPrompt } =
    await promptForRag()

  console.log(kbInfo, "kbInfo")
  if (kbInfo?.systemPrompt?.trim()) {
    systemPrompt = kbInfo.systemPrompt
  }

  if (kbInfo?.followupPrompt?.trim()) {
    questionPrompt = kbInfo.followupPrompt
  }

  if (messages.length > 2) {
    const lastTenMessages = messages.slice(-10)
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
  const docSize = await getNoOfRetrievedDocs()
  // const useVS = await isChatWithWebsiteEnabled()
  // if (useVS) {
  const docs = await vectorstore.similaritySearchKB(query, docSize)
  context = formatDocs(docs)
  source = docs.map((doc) => {
    return {
      ...doc,
      name: doc?.metadata?.source || "untitled",
      type: doc?.metadata?.type || "unknown",
      mode: "rag",
      url: ""
    }
  })
  // } else {
  //   const docs = await vectorstore.getAllPageContent()
  //   context = docs.pageContent
  //   source = docs.metadata.map((doc) => {
  //     return {
  //       ...doc,
  //       name: doc?.source || "untitled",
  //       type: doc?.type || "unknown",
  //       mode: "rag",
  //       url: ""
  //     }
  //   })
  // }
  //  message = message.trim().replaceAll("\n", " ")

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

  const applicationChatHistory = generateHistory(history, selectedModel)

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
    messageType: ""
  })
}
