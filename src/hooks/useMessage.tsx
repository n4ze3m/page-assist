import React from "react"
import { cleanUrl } from "~/libs/clean-url"
import { promptForRag, systemPromptForNonRag } from "~/services/tldw-server"
import { useStoreMessageOption, type Message } from "~/store/option"
import { useStoreMessage } from "~/store"
import { getContentFromCurrentTab } from "~/libs/get-html"
// RAG now uses tldw_server endpoints instead of local embeddings
import { ChatHistory } from "@/store/option"
import {
  deleteChatForEdit,
  generateID,
  getPromptById,
  removeMessageUsingHistoryId,
  updateMessageByIndex
} from "@/db/dexie/helpers"
import { useTranslation } from "react-i18next"
import { usePageAssist } from "@/context"
import { formatDocs } from "@/utils/format-docs"
import { useStorage } from "@plasmohq/storage/hook"
import { useStoreChatModelSettings } from "@/store/model"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { pageAssistModel } from "@/models"
import { getPrompt } from "@/services/application"
import { humanMessageFormatter } from "@/utils/human-message"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { getScreenshotFromCurrentTab } from "@/libs/get-screenshot"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent,
  removeReasoning
} from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import type { Character } from "@/types/character"
import { createBranchMessage } from "./handlers/messageHandlers"
import {
  createSaveMessageOnError,
  createSaveMessageOnSuccess
} from "./utils/messageHelpers"
import { normalChatMode } from "./chat-modes/normalChatMode"
import { updatePageTitle } from "@/utils/update-page-title"
import { useAntdNotification } from "./useAntdNotification"

type ServerBackedMessage = Message & {
  serverMessageId?: string
  serverMessageVersion?: number
}

export const useMessage = () => {
  const {
    controller: abortController,
    setController: setAbortController,
    messages,
    setMessages,
    embeddingController,
    setEmbeddingController
  } = usePageAssist()
  const { t } = useTranslation("option")
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const currentChatModelSettings = useStoreChatModelSettings()
  const {
    setIsSearchingInternet,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    temporaryChat,
    setTemporaryChat,
    queuedMessages,
    addQueuedMessage,
    clearQueuedMessages
  } = useStoreMessageOption()
  const [defaultInternetSearchOn] = useStorage("defaultInternetSearchOn", false)

  const [defaultChatWithWebsite] = useStorage("defaultChatWithWebsite", false)

  const [chatWithWebsiteEmbedding] = useStorage(
    "chatWithWebsiteEmbedding",
    false
  )
  const [maxWebsiteContext] = useStorage("maxWebsiteContext", 4028)
  const [selectedCharacter] = useStorage<Character | null>(
    "selectedCharacter",
    null
  )

  const {
    history,
    setHistory,
    setStreaming,
    streaming,
    setIsFirstMessage,
    historyId,
    setHistoryId,
    isLoading,
    setIsLoading,
    isProcessing,
    setIsProcessing,
    chatMode,
    setChatMode,
    setIsEmbedding,
    isEmbedding,
    currentURL,
    setCurrentURL,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    useOCR,
    setUseOCR
  } = useStoreMessage()
  const {
    serverChatId,
    setServerChatId,
    serverChatState,
    setServerChatState,
    serverChatTopic,
    setServerChatTopic,
    serverChatClusterId,
    setServerChatClusterId,
    serverChatSource,
    setServerChatSource,
    serverChatExternalRef,
    setServerChatExternalRef
  } = useStoreMessageOption()
  const notification = useAntdNotification()
  const [sidepanelTemporaryChat] = useStorage("sidepanelTemporaryChat", false)
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )

  React.useEffect(() => {
    if (!serverChatId) return
    const loadChatMeta = async () => {
      try {
        await tldwClient.initialize().catch(() => null)
        const chat = await tldwClient.getChat(serverChatId)
        setServerChatState(
          (chat as any)?.state ??
            (chat as any)?.conversation_state ??
            "in-progress"
        )
        setServerChatTopic((chat as any)?.topic_label ?? null)
        setServerChatClusterId((chat as any)?.cluster_id ?? null)
        setServerChatSource((chat as any)?.source ?? null)
        setServerChatExternalRef((chat as any)?.external_ref ?? null)
      } catch {
        // ignore metadata hydration failures
      }
    }
    void loadChatMeta()
  }, [
    serverChatId,
    setServerChatClusterId,
    setServerChatExternalRef,
    setServerChatSource,
    setServerChatState,
    setServerChatTopic
  ])

  React.useEffect(() => {
    // Reset server chat when character changes
    setServerChatId(null)
  }, [selectedCharacter?.id])

  // Local embedding store removed; rely on tldw_server RAG

  const clearChat = () => {
    stopStreamingRequest()
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
    setIsLoading(false)
    setIsProcessing(false)
    setStreaming(false)
    updatePageTitle() 
    currentChatModelSettings.reset()
    setServerChatId(null)
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
    if (defaultChatWithWebsite) {
      setChatMode("rag")
    }
    if (sidepanelTemporaryChat) {
      setTemporaryChat(true)
    }
  }

  const saveMessageOnSuccess = createSaveMessageOnSuccess(
    temporaryChat,
    setHistoryId as (id: string) => void
  )
  const saveMessageOnError = createSaveMessageOnError(
    temporaryChat,
    history,
    setHistory,
    setHistoryId as (id: string) => void
  )

  const chatWithWebsiteMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal,
    embeddingSignal: AbortSignal
  ) => {
    setStreaming(true)
    const userDefaultModelSettings = await getAllDefaultModelSettings()

    const ollama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: ""
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
    let embedURL: string, embedHTML: string, embedType: string
    let embedPDF: { content: string; page: number }[] = []

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
    } else if (currentURL !== websiteUrl) {
      setCurrentURL(websiteUrl)
    } else {
      embedURL = currentURL
    }
    setMessages(newMessage)
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
        const questionOllama = await pageAssistModel({ model: selectedModel!, baseUrl: "" })
        const response = await questionOllama.invoke(promptForQuestion)
        query = response.content.toString()
        query = removeReasoning(query)
      }

      let context: string = ""
      let source: {
        name: any
        type: any
        mode: string
        url: string
        pageContent: string
        metadata: Record<string, any>
      }[] = []

      if (chatWithWebsiteEmbedding) {
        try {
          await tldwClient.initialize()
          // Optionally ensure server has the page content in the media index
          if (embedURL) {
            try { await tldwClient.addMedia(embedURL, {}) } catch {}
          }
          const ragRes = await tldwClient.ragSearch(query, { top_k: 4, filters: { url: embedURL } })
          const docs = ragRes?.results || ragRes?.documents || ragRes?.docs || []
          context = formatDocs(
            docs.map((d: any) => ({ pageContent: d.content || d.text || d.chunk || "", metadata: d.metadata || {} }))
          )
          source = docs.map((d: any) => ({
            name: d.metadata?.source || d.metadata?.title || "untitled",
            type: d.metadata?.type || "unknown",
            mode: "chat",
            url: d.metadata?.url || "",
            pageContent: d.content || d.text || d.chunk || "",
            metadata: d.metadata || {}
          }))
        } catch (e) {
          console.error('tldw ragSearch failed, falling back to inline context', e)
        }
      }
      if (!context) {
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
      let reasoningStartTime: Date | null = null
      let reasoningEndTime: Date | null = null
      let timetaken = 0
      let apiReasoning = false
      for await (const chunk of chunks) {
        const token = typeof chunk === 'string'
          ? chunk
          : (chunk?.content ?? (chunk?.choices?.[0]?.delta?.content ?? ''))
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
        message_source: "copilot",
        generationInfo,
        reasoning_time_taken: timetaken
      })

      setIsProcessing(false)
      setStreaming(false)
    } catch (e) {
      console.error(e)
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
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }
      setIsProcessing(false)
      setStreaming(false)
      setIsEmbedding(false)
    } finally {
      setAbortController(null)
      setEmbeddingController(null)
    }
  }

  const visionChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal
  ) => {
    setStreaming(true)
    const ollama = await pageAssistModel({ model: selectedModel!, baseUrl: "" })

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

    try {
      const prompt = await systemPromptForNonRag()
      const selectedPrompt = await getPromptById(selectedSystemPrompt)

      const applicationChatHistory = []
      // Inject selected character's system prompt at highest priority
      if (selectedCharacter?.system_prompt) {
        applicationChatHistory.unshift(
          await systemPromptFormatter({ content: selectedCharacter.system_prompt })
        )
      }

      const data = await getScreenshotFromCurrentTab()

      const visionImage = data?.screenshot || ""

      if (visionImage === "") {
        throw new Error(
          data?.error ||
            "Please close and reopen the side panel. This is a bug that will be fixed soon."
        )
      }

      if (!selectedCharacter?.system_prompt && prompt && !selectedPrompt) {
        applicationChatHistory.unshift(
          await systemPromptFormatter({
            content: prompt
          })
        )
      }
      if (!selectedCharacter?.system_prompt && selectedPrompt) {
        applicationChatHistory.unshift(
          await systemPromptFormatter({
            content: selectedPrompt.content
          })
        )
      }

      let humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: "text"
          },
          {
            image_url: visionImage,
            type: "image_url"
          }
        ],
        model: selectedModel,
        useOCR
      })

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
      let timetaken = 0
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

        const token = typeof chunk === 'string'
          ? chunk
          : (chunk?.content ?? (chunk?.choices?.[0]?.delta?.content ?? ''))
        if (token && token.length > 0) {
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
      setMessages((prev) => {
        return prev.map((message) => {
          if (message.id === generateMessageId) {
            return {
              ...message,
              message: fullText,
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
          content: message
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
        generationInfo,
        reasoning_time_taken: timetaken
      })

      setIsProcessing(false)
      setStreaming(false)
    } catch (e) {
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
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }
      setIsProcessing(false)
      setStreaming(false)
      setIsEmbedding(false)
    } finally {
      setAbortController(null)
      setEmbeddingController(null)
    }
  }

  const characterChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal
  ) => {
    setStreaming(true)
    let fullText = ""

    if (!selectedCharacter?.id) {
      throw new Error("No character selected")
    }

    try {
      await tldwClient.initialize()

      // Visual placeholder
      const modelInfo = await getModelNicknameByID(selectedModel)
      const generateMessageId = generateID()
      const newMessageList: Message[] = !isRegenerate
        ? [
            ...messages,
            { isBot: false, name: 'You', message, sources: [], images: [] },
            { isBot: true, name: selectedModel, message: '▋', sources: [], id: generateMessageId, modelImage: modelInfo?.model_avatar, modelName: modelInfo?.model_name || selectedModel }
          ]
        : [
            ...messages,
            { isBot: true, name: selectedModel, message: '▋', sources: [], id: generateMessageId, modelImage: modelInfo?.model_avatar, modelName: modelInfo?.model_name || selectedModel }
          ]
      setMessages(newMessageList)

      // Ensure server chat session exists
      let chatId = serverChatId
      if (!chatId) {
        const created = await tldwClient.createChat({
          character_id: selectedCharacter.id,
          state: serverChatState || "in-progress",
          topic_label: serverChatTopic || undefined,
          cluster_id: serverChatClusterId || undefined,
          source: serverChatSource || undefined,
          external_ref: serverChatExternalRef || undefined
        })
        const rawId =
          (created as any)?.id ??
          (created as any)?.chat_id ??
          created
        const normalizedId = rawId != null ? String(rawId) : ""
        if (!normalizedId) {
          throw new Error('Failed to create character chat session')
        }
        chatId = normalizedId
        setServerChatId(normalizedId)
        setServerChatState(
          (created as any)?.state ?? (created as any)?.conversation_state ?? "in-progress"
        )
        setServerChatTopic((created as any)?.topic_label ?? null)
        setServerChatClusterId((created as any)?.cluster_id ?? null)
        setServerChatSource((created as any)?.source ?? null)
        setServerChatExternalRef((created as any)?.external_ref ?? null)
      }

      // Add user message to server (only if not regenerate)
      if (!isRegenerate) {
        const payload: any = { role: 'user', content: message }
        if (image && image.startsWith('data:')) {
          const b64 = image.split(',')[1]
          if (b64) payload.image_base64 = b64
        }
        const createdUser = await tldwClient.addChatMessage(chatId, payload)
        setMessages((prev) => {
          const updated = [...prev] as ServerBackedMessage[]
          for (let i = updated.length - 1; i >= 0; i--) {
            if (!updated[i].isBot) {
              updated[i] = { ...updated[i], serverMessageId: createdUser?.id, serverMessageVersion: createdUser?.version }
              break
            }
          }
          return updated
        })
      }

      // Get messages formatted for completions with character context
      const formatted: any = await tldwClient.listChatMessages(chatId, {
        include_character_context: true,
        format_for_completions: true
      })
      const msgs = Array.isArray(formatted) ? formatted : (formatted?.messages || [])

      // Stream completion from server /chat/completions
      let count = 0
      for await (const chunk of tldwClient.streamChatCompletion({ messages: msgs, model: selectedModel!, stream: true }, { signal })) {
        const token = chunk?.choices?.[0]?.delta?.content || chunk?.content || ''
        if (token) {
          fullText += token
          setMessages((prev) => prev.map((m) => (m.id === generateMessageId ? { ...m, message: fullText + '▋' } : m)))
        }
        if (count === 0) setIsProcessing(true)
        count++
        if (signal?.aborted) break
      }
      setMessages((prev) => prev.map((m) => (m.id === generateMessageId ? { ...m, message: fullText } : m)))

      // Persist assistant reply on server
      try {
        const createdAsst = await tldwClient.addChatMessage(chatId, { role: 'assistant', content: fullText })
        setMessages((prev) =>
          (prev as ServerBackedMessage[]).map((m) =>
            m.id === generateMessageId
              ? {
                  ...m,
                  serverMessageId: createdAsst?.id,
                  serverMessageVersion: createdAsst?.version
                }
              : m
          )
        )
      } catch (e) {
        console.error("Failed to persist assistant message to server:", e)
      }

      // Update local history as well (keeps local features consistent)
      setHistory([
        ...history,
        { role: 'user', content: message, image },
        { role: 'assistant', content: fullText }
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
        message_source: 'copilot'
      })

      setIsProcessing(false)
      setStreaming(false)
    } catch (e) {
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
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }
      setIsProcessing(false)
      setStreaming(false)
    } finally {
      setAbortController(null)
    }
  }

  // Web search mode removed - use tldw_server for search functionality

  const presetChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal,
    messageType: string
  ) => {
    setStreaming(true)

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    const ollama = await pageAssistModel({ model: selectedModel!, baseUrl: "" })

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
          images: [image],
          messageType: messageType
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

    try {
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

      let generationInfo: any | undefined = undefined

      const chunks = await ollama.stream([humanMessage], {
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
      })
      let count = 0
      let reasoningStartTime: Date | null = null
      let reasoningEndTime: Date | null = null
      let timetaken = 0
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

        const token = typeof chunk === 'string'
          ? chunk
          : (chunk?.content ?? (chunk?.choices?.[0]?.delta?.content ?? ''))
        if (token && token.length > 0) {
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

      setMessages((prev) => {
        return prev.map((message) => {
          if (message.id === generateMessageId) {
            return {
              ...message,
              message: fullText,
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
    } catch (e) {
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
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }
      setIsProcessing(false)
      setStreaming(false)
    } finally {
      setAbortController(null)
    }
  }

  const onSubmit = async ({
    message,
    image,
    isRegenerate,
    controller,
    memory,
    messages: chatHistory,
    messageType
  }: {
    message: string
    image: string
    isRegenerate?: boolean
    messages?: Message[]
    memory?: ChatHistory
    controller?: AbortController
    messageType?: string
  }) => {
    let signal: AbortSignal
    if (!controller) {
      const newController = new AbortController()
      signal = newController.signal
      setAbortController(newController)
    } else {
      setAbortController(controller)
      signal = controller.signal
    }

    // this means that the user is trying to send something from a selected text on the web
    if (messageType) {
      await presetChatMode(
        message,
        image,
        isRegenerate,
        chatHistory || messages,
        memory || history,
        signal,
        messageType
      )
    } else {
      if (chatMode === "normal") {
        if (selectedCharacter?.id) {
          await characterChatMode(
            message,
            image,
            isRegenerate,
            chatHistory || messages,
            memory || history,
            signal
          )
        } else {
          await normalChatMode(
            message,
            image,
            isRegenerate,
            chatHistory || messages,
            memory || history,
            signal,
            {
              selectedModel: selectedModel!,
              useOCR,
              selectedSystemPrompt: selectedSystemPrompt ?? "",
              currentChatModelSettings,
              setMessages,
              saveMessageOnSuccess,
              saveMessageOnError,
              setHistory,
              setIsProcessing,
              setStreaming,
              setAbortController,
              historyId,
              setHistoryId: setHistoryId as (id: string) => void,
              webSearch,
              setIsSearchingInternet
            }
          )
        }
      } else if (chatMode === "vision") {
        await visionChatMode(
          message,
          image,
          isRegenerate,
          chatHistory || messages,
          memory || history,
          signal
        )
      } else {
        const newEmbeddingController = new AbortController()
        let embeddingSignal = newEmbeddingController.signal
        setEmbeddingController(newEmbeddingController)
        await chatWithWebsiteMode(
          message,
          image,
          isRegenerate,
          chatHistory || messages,
          memory || history,
          signal,
          embeddingSignal
        )
      }
    }
  }

  const stopStreamingRequest = () => {
    if (isEmbedding) {
      if (embeddingController) {
        embeddingController.abort()
        setEmbeddingController(null)
      }
    }
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }

  const editMessage = async (
    index: number,
    message: string,
    isHuman: boolean
  ) => {
    let newMessages = messages as ServerBackedMessage[]
    let newHistory = history

    if (isHuman) {
      const currentHumanMessage = newMessages[index] as ServerBackedMessage | undefined
      newMessages[index].message = message
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(historyId, index, message)
      await deleteChatForEdit(historyId, index)
      // Server-backed edit and cleanup
      if (selectedCharacter?.id && serverChatId) {
        if (currentHumanMessage?.serverMessageId) {
          try {
            const srv = await tldwClient.getMessage(currentHumanMessage.serverMessageId)
            const ver = srv?.version
            if (ver != null) await tldwClient.editMessage(currentHumanMessage.serverMessageId, message, Number(ver))
          } catch {}
        }
        try {
          const res: any = await tldwClient.listChatMessages(serverChatId, { include_deleted: 'false' })
          const list: any[] = Array.isArray(res) ? res : (res?.messages || [])
          const serverIds = list.map((m: any) => m.id)
          const targetSrvId = currentHumanMessage?.serverMessageId
          const startIdx = targetSrvId ? serverIds.indexOf(targetSrvId) : -1
          if (startIdx >= 0) {
            for (let i = startIdx + 1; i < list.length; i++) {
              const m = list[i]
              try { await tldwClient.deleteMessage(m.id, Number(m.version)) } catch {}
            }
          }
        } catch {}
      }
      const abortController = new AbortController()
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController
      })
    } else {
      // Assistant message edited
      const currentAssistant = newMessages[index] as ServerBackedMessage | undefined
      newMessages[index].message = message
      setMessages(newMessages)
      newHistory[index].content = message
      setHistory(newHistory)
      await updateMessageByIndex(historyId, index, message)
      // Server-backed: update assistant server message too
      if (selectedCharacter?.id && currentAssistant?.serverMessageId) {
        try {
          const srv = await tldwClient.getMessage(currentAssistant.serverMessageId)
          const ver = srv?.version
          if (ver != null) await tldwClient.editMessage(currentAssistant.serverMessageId, message, Number(ver))
        } catch {}
      }
    }
  }

  const regenerateLastMessage = async () => {
    if (history.length > 0) {
      const lastMessage = history[history.length - 2]
      let newHistory = history.slice(0, -2)
      let mewMessages = messages as ServerBackedMessage[]
      // If server-backed and last assistant has server message id, delete it on server
      if (selectedCharacter?.id && serverChatId) {
        const lastAssistant = ([...mewMessages].reverse().find((m) => m.isBot) as ServerBackedMessage | undefined)
        if (lastAssistant?.serverMessageId) {
          try {
            let version = lastAssistant.serverMessageVersion
            if (version == null) {
              const srv = await tldwClient.getMessage(lastAssistant.serverMessageId)
              version = srv?.version
            }
            if (version != null) await tldwClient.deleteMessage(lastAssistant.serverMessageId, Number(version))
          } catch {}
        }
      }
      mewMessages.pop()
      setHistory(newHistory)
      setMessages(mewMessages)
      await removeMessageUsingHistoryId(historyId)
      if (lastMessage.role === "user") {
        const newController = new AbortController()
        await onSubmit({
          message: lastMessage.content,
          image: lastMessage.image || "",
          isRegenerate: true,
          memory: newHistory,
          controller: newController,
          messageType: lastMessage.messageType
        })
      }
    }
  }
  const createChatBranch = createBranchMessage({
    historyId,
    setHistory,
    setHistoryId,
    setMessages,
    setSelectedSystemPrompt,
    setSystemPrompt: currentChatModelSettings.setSystemPrompt,
    serverChatId,
    setServerChatId,
    serverChatState,
    setServerChatState,
    serverChatTopic,
    setServerChatTopic,
    serverChatClusterId,
    setServerChatClusterId,
    serverChatSource,
    setServerChatSource,
    serverChatExternalRef,
    setServerChatExternalRef,
    messages,
    history
  })
  return {
    messages,
    setMessages,
    editMessage,
    onSubmit,
    setStreaming,
    streaming,
    setHistory,
    historyId,
    setHistoryId,
    setIsFirstMessage,
    isLoading,
    setIsLoading,
    isProcessing,
    stopStreamingRequest,
    clearChat,
    selectedModel,
    setSelectedModel,
    chatMode,
    setChatMode,
    isEmbedding,
    regenerateLastMessage,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    speechToTextLanguage,
    setSpeechToTextLanguage,
    useOCR,
    setUseOCR,
    defaultInternetSearchOn,
    defaultChatWithWebsite,
    serverChatId,
    setServerChatId,
    serverChatState,
    setServerChatState,
    serverChatTopic,
    setServerChatTopic,
    serverChatClusterId,
    setServerChatClusterId,
    serverChatSource,
    setServerChatSource,
    serverChatExternalRef,
    setServerChatExternalRef,
    history,
    createChatBranch,
    temporaryChat,
    setTemporaryChat,
    sidepanelTemporaryChat,
    queuedMessages,
    addQueuedMessage,
    clearQueuedMessages
  }
}
