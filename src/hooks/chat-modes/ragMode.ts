import { cleanUrl } from "~/libs/clean-url"
import { promptForRag } from "~/services/tldw-server" // Reuse prompts storage for now
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
import { formatDocs } from "@/chain/chat-with-x"
import { getNoOfRetrievedDocs } from "@/services/app"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import type { ActorSettings } from "@/types/actor"
import { maybeInjectActorMessage } from "@/utils/actor"

type RagModeParams = {
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
  ragMediaIds: number[] | null
  ragSearchMode: "hybrid" | "vector" | "fts"
  ragTopK: number | null
  ragEnableGeneration: boolean
  ragEnableCitations: boolean
  ragSources: string[]
  actorSettings?: ActorSettings
}

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
    setHistoryId,
    ragMediaIds,
    ragSearchMode,
    ragTopK,
    ragEnableGeneration,
    ragEnableCitations,
    ragSources,
    actorSettings
  }: RagModeParams
) => {
  console.log("Using ragMode")
  const url = cleanUrl((await (await new (await import("@plasmohq/storage")).Storage({ area: 'local' })).get("tldwConfig") as any)?.serverUrl || "")
  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: url
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

  // Use tldw_server RAG endpoint instead of local embeddings
  let timetaken = 0
  try {
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
    const defaultTopK = await getNoOfRetrievedDocs()
    let context: string = ""
    let source: any[] = []
    try {
      await tldwClient.initialize()
      const top_k =
        typeof ragTopK === "number" && ragTopK > 0 ? ragTopK : defaultTopK
      const ragOptions: any = {
        top_k,
        search_mode: ragSearchMode
      }
      if (ragEnableGeneration) {
        ragOptions.enable_generation = true
      }
      if (ragEnableCitations) {
        ragOptions.enable_citations = true
      }
      if (Array.isArray(ragSources) && ragSources.length > 0) {
        ragOptions.sources = ragSources
      }
      if (Array.isArray(ragMediaIds) && ragMediaIds.length > 0) {
        ragOptions.include_media_ids = ragMediaIds
        // When a specific media list is provided, ensure we query the media DB
        ragOptions.sources = ["media_db"]
      }
      const ragRes = await tldwClient.ragSearch(query, ragOptions)
      const docs = ragRes?.results || ragRes?.documents || ragRes?.docs || []
      context = formatDocs(
        docs.map((d: any) => ({ pageContent: d.content || d.text || d.chunk || "", metadata: d.metadata || {} }))
      )
      source = docs.map((d: any) => ({
        name: d.metadata?.source || d.metadata?.title || "untitled",
        type: d.metadata?.type || "unknown",
        mode: "rag",
        url: d.metadata?.url || "",
        pageContent: d.content || d.text || d.chunk || "",
        metadata: d.metadata || {}
      }))
    } catch (e) {
      console.error('tldw ragSearch failed, continuing without context', e)
      context = ""
      source = []
    }
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

    let applicationChatHistory = generateHistory(history, selectedModel)

    const templatesActive = false
    applicationChatHistory = await maybeInjectActorMessage(
      applicationChatHistory,
      actorSettings || null,
      templatesActive
    )

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
      const token = typeof chunk === 'string' ? chunk : (chunk?.content ?? (chunk?.choices?.[0]?.delta?.content ?? ''))
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

      if (token) {
        contentToSave += token
        fullText += token
      }
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
