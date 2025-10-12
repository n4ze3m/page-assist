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
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent,
  removeReasoning
} from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"
import { formatDocs } from "@/chain/chat-with-x"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { getNoOfRetrievedDocs } from "@/services/app"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { isChatWithWebsiteEnabled } from "@/services/kb"
import { getKnowledgeById } from "@/db/dexie/knowledge"

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
  console.log("Using ragMode")
  const url = await getOllamaURL()
  const userDefaultModelSettings = await getAllDefaultModelSettings()

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
        name: "You",
        message,
        sources: [],
        images: []
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
      ...messages,
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
  let fullText = ""
  let contentToSave = ""

  const embeddingModle = await defaultEmbeddingModelForRag()
  const ollamaUrl = await getOllamaURL()
  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModle || selectedModel,
    baseUrl: cleanUrl(ollamaUrl),
    keepAlive:
      currentChatModelSettings?.keepAlive ??
      userDefaultModelSettings?.keepAlive
  })

  const kbInfo = await getKnowledgeById(selectedKnowledge.id)

  let vectorstore = await PageAssistVectorStore.fromExistingIndex(
    ollamaEmbedding,
    {
      file_id: null,
      knownledge_id: selectedKnowledge.id
    }
  )
  let timetaken = 0
  try {
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
    const docSize = await getNoOfRetrievedDocs()
    // const useVS = await isChatWithWebsiteEnabled()
    let context: string = ""
    let source: any[] = []
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

    let generationInfo: any | undefined = undefined

    const chunks = await ollama.stream(
      [...applicationChatHistory, humanMessage],
      {
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
      }
    )
    let count = 0
    let reasoningStartTime: Date | undefined = undefined
    let reasoningEndTime: Date | undefined = undefined
    let apiReasoning = false

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
      if (count === 0) {
        setIsProcessing(true)
      }
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
    // update the message with the full text
    setMessages((prev) => {
      return prev.map((message) => {
        if (message.id === generateMessageId) {
          return {
            ...message,
            message: fullText,
            sources: source,
            generationInfo,
            reasoning_time_taken: timetaken
          }
        }
        return message
      })
    })

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
  } catch (e) {
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
  } finally {
    setAbortController(null)
  }
}
