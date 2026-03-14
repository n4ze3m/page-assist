import React from "react"
import { cleanUrl } from "~/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  geWebSearchFollowUpPrompt,
  getOllamaURL,
  promptForRag,
  systemPromptForNonRag
} from "~/services/ollama"
import { useStoreMessageOption, type Message } from "~/store/option"
import { useStoreMessage } from "~/store"
import { getContentFromCurrentTab } from "~/libs/get-html"
import { memoryEmbedding } from "@/utils/memory-embeddings"
import { ChatHistory } from "@/store/option"
import {
  deleteChatForEdit,
  generateID,
  getPromptById,
  removeMessageUsingHistoryId,
  updateMessageByIndex
} from "@/db/dexie/helpers"
import { notification } from "antd"
import { useTranslation } from "react-i18next"
import { usePageAssist } from "@/context"
import { formatDocs } from "@/chain/chat-with-x"
import { useStorage } from "@plasmohq/storage/hook"
import { useStoreChatModelSettings } from "@/store/model"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { getSystemPromptForWeb, isQueryHaveWebsite } from "@/web/web"
import { pageAssistModel } from "@/models"
import { getPrompt } from "@/services/application"
import { humanMessageFormatter } from "@/utils/human-message"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { PAMemoryVectorStore } from "@/libs/PAMemoryVectorStore"
import { getScreenshotFromCurrentTab } from "@/libs/get-screenshot"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent,
  removeReasoning
} from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import {
  createBranchMessage,
  createRegenerateLastMessage
} from "./handlers/messageHandlers"
import {
  createSaveMessageOnError,
  createSaveMessageOnSuccess
} from "./utils/messageHelpers"
import { updatePageTitle } from "@/utils/update-page-title"
import { getNoOfRetrievedDocs } from "@/services/app"
import { normalChatMode as sharedNormalChatMode } from "./chat-modes/normalChatMode"

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
    actionInfo,
    setActionInfo
  } = useStoreMessageOption()
  const [defaultInternetSearchOn] = useStorage("defaultInternetSearchOn", false)

  const [defaultChatWithWebsite] = useStorage("defaultChatWithWebsite", false)

  const [chatWithWebsiteEmbedding] = useStorage(
    "chatWithWebsiteEmbedding",
    false
  )
  const [maxWebsiteContext] = useStorage("maxWebsiteContext", 4028)

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
  const [sidepanelTemporaryChat] = useStorage("sidepanelTemporaryChat", false)
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )

  const [keepTrackOfEmbedding, setKeepTrackOfEmbedding] = React.useState<{
    [key: string]: PAMemoryVectorStore
  }>({})

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
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
    if (defaultChatWithWebsite) {
      setChatMode("rag")
    }
    if (sidepanelTemporaryChat) {
      setTemporaryChat(true)
    }
    setActionInfo(null)
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

  const messagesRef = React.useRef(messages)
  const historyRef = React.useRef(history)
  const historyIdRef = React.useRef(historyId)
  const onSubmitRef = React.useRef<(params: any) => Promise<void>>(
    async () => {}
  )

  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  React.useEffect(() => {
    historyRef.current = history
  }, [history])

  React.useEffect(() => {
    historyIdRef.current = historyId
  }, [historyId])

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
      isAlreadyExistEmbedding = keepTrackOfEmbedding[currentURL]
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
        currentChatModelSettings?.keepAlive ??
        userDefaultModelSettings?.keepAlive
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
      let source: {
        name: any
        type: any
        mode: string
        url: string
        pageContent: string
        metadata: Record<string, any>
      }[] = []

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
        if (chunk?.additional_kwargs?.reasoning_content) {
          const reasoningContent = mergeReasoningContent(
            fullText,
            chunk?.additional_kwargs?.reasoning_content || ""
          )
          contentToSave = reasoningContent
          fullText = reasoningContent
          apiReasoning = true
        }

        if (apiReasoning && chunk?.content) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
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
          image,
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
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }
      setIsProcessing(false)
      setStreaming(false)
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
    const url = await getOllamaURL()

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

    try {
      const prompt = await systemPromptForNonRag()
      const selectedPrompt = await getPromptById(selectedSystemPrompt)

      const applicationChatHistory = []

      const data = await getScreenshotFromCurrentTab()

      const visionImage = data?.screenshot || ""

      if (visionImage === "") {
        throw new Error(
          data?.error ||
            "Please close and reopen the side panel. This is a bug that will be fixed soon."
        )
      }

      if (prompt && !selectedPrompt) {
        applicationChatHistory.unshift(
          await systemPromptFormatter({
            content: prompt
          })
        )
      }
      if (selectedPrompt) {
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
        }

        if (apiReasoning && chunk?.content) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
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
      setIsProcessing(false)
      setStreaming(false)
      setIsEmbedding(false)
    } finally {
      setAbortController(null)
      setEmbeddingController(null)
    }
  }

  const normalChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal,
    images?: string[]
  ) => {
    setStreaming(true)
    const url = await getOllamaURL()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    // Process multiple images if provided
    const processedImages = images?.length > 0
      ? images.map(img => {
          if (img.length > 0 && !img.startsWith('data:')) {
            return `data:image/jpeg;base64,${img.split(",")[1]}`
          }
          return img
        }).filter(img => img.length > 0)
      : image.length > 0 ? [image] : []

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
          images: processedImages
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

      let humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: "text"
          }
        ],
        model: selectedModel,
        useOCR
      })
      if (processedImages.length > 0) {
        humanMessage = await humanMessageFormatter({
          content: [
            {
              text: message,
              type: "text"
            },
            ...processedImages.map(img => ({
              image_url: img,
              type: "image_url" as const
            }))
          ],
          model: selectedModel,
          useOCR
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
      if (selectedPrompt) {
        applicationChatHistory.unshift(
          await systemPromptFormatter({
            content: selectedPrompt.content
          })
        )
      }

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
        if (chunk?.additional_kwargs?.reasoning_content) {
          const reasoningContent = mergeReasoningContent(
            fullText,
            chunk?.additional_kwargs?.reasoning_content || ""
          )
          contentToSave = reasoningContent
          fullText = reasoningContent
          apiReasoning = true
        }

        if (apiReasoning && chunk?.content) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
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
          images: processedImages
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
    } finally {
      setAbortController(null)
    }
  }

  const searchChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal,
    images?: string[]
  ) => {
    const url = await getOllamaURL()
    setStreaming(true)
    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    // Process multiple images if provided
    const processedImages = images?.length > 0
      ? images.map(img => {
          if (img.length > 0 && !img.startsWith('data:')) {
            return `data:image/jpeg;base64,${img.split(",")[1]}`
          }
          return img
        }).filter(img => img.length > 0)
      : image.length > 0 ? [image] : []

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
          images: processedImages
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
      setIsSearchingInternet(true)

      let query = message

      // if (newMessage.length > 2) {
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

      if (processedImages.length > 0) {
        questionMessage = await humanMessageFormatter({
          content: [
            {
              text: promptForQuestion,
              type: "text"
            },
            ...processedImages.map(img => ({
              image_url: img,
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

      const { prompt, source } = await getSystemPromptForWeb(query)
      setIsSearchingInternet(false)

      //  message = message.trim().replaceAll("\n", " ")

      let humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: "text"
          }
        ],
        model: selectedModel,
        useOCR
      })
      if (processedImages.length > 0) {
        humanMessage = await humanMessageFormatter({
          content: [
            {
              text: message,
              type: "text"
            },
            ...processedImages.map(img => ({
              image_url: img,
              type: "image_url" as const
            }))
          ],
          model: selectedModel,
          useOCR
        })
      }

      const applicationChatHistory = generateHistory(history, selectedModel)

      if (prompt) {
        applicationChatHistory.unshift(
          await systemPromptFormatter({
            content: prompt
          })
        )
      }

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
      let timetaken = 0
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
        }

        if (apiReasoning && chunk?.content) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
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
          image,
          images: processedImages
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

  const presetChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal,
    messageType: string,
    images?: string[]
  ) => {
    setStreaming(true)
    const url = await getOllamaURL()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    // Process multiple images if provided
    const processedImages = images?.length > 0
      ? images.map(img => {
          if (img.length > 0 && !img.startsWith('data:')) {
            return `data:image/jpeg;base64,${img.split(",")[1]}`
          }
          return img
        }).filter(img => img.length > 0)
      : image.length > 0 ? [image] : []

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
          images: processedImages,
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
      if (processedImages.length > 0) {
        humanMessage = await humanMessageFormatter({
          content: [
            {
              text: prompt.replace("{text}", message),
              type: "text"
            },
            ...processedImages.map(img => ({
              image_url: img,
              type: "image_url" as const
            }))
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
        }

        if (apiReasoning && chunk?.content) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
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
          messageType,
          images: processedImages
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
    images,
    isRegenerate,
    controller,
    memory,
    messages: chatHistory,
    messageType,
    chatType
  }: {
    message: string
    image: string
    images?: string[]
    isRegenerate?: boolean
    messages?: Message[]
    memory?: ChatHistory
    controller?: AbortController
    messageType?: string
    chatType?: string
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

    if (chatType === "youtube") {
      setChatMode("rag")
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
      return
    }

    if (messageType) {
      await presetChatMode(
        message,
        image,
        isRegenerate,
        chatHistory || messages,
        memory || history,
        signal,
        messageType,
        images
      )
    } else {
      if (chatMode === "normal") {
        if (webSearch) {
          await searchChatMode(
            message,
            image,
            isRegenerate || false,
            messages,
            memory || history,
            signal,
            images
          )
        } else {
          await sharedNormalChatMode(
            message,
            image,
            isRegenerate,
            chatHistory || messages,
            memory || history,
            signal,
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
              images,
              setActionInfo,
              temporaryChat,
              messageSource: "copilot"
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

  React.useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])

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

  const editMessage = React.useCallback(async (
    index: number,
    message: string,
    isHuman: boolean
  ) => {
    const currentMessages = messagesRef.current
    const currentHistory = historyRef.current
    const currentHistoryId = historyIdRef.current
    const nextMessages = currentMessages.map((currentMessage, currentIndex) =>
      currentIndex === index
        ? {
            ...currentMessage,
            message
          }
        : currentMessage
    )
    const nextHistory = currentHistory.map((currentMessage, currentIndex) =>
      currentIndex === index
        ? {
            ...currentMessage,
            content: message
          }
        : currentMessage
    )

    if (isHuman) {
      const currentHumanMessage = nextMessages[index]
      const previousMessages = nextMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = nextHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(currentHistoryId, index, message)
      await deleteChatForEdit(currentHistoryId, index)
      const abortController = new AbortController()
      await onSubmitRef.current({
        message: message,
        image: currentHumanMessage.images?.[0] || "",
        images: currentHumanMessage.images || [],
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController
      })
    } else {
      setMessages(nextMessages)
      setHistory(nextHistory)
      await updateMessageByIndex(currentHistoryId, index, message)
    }
  }, [setMessages, setHistory])

  const getMessages = React.useCallback(() => messagesRef.current, [])
  const getHistory = React.useCallback(() => historyRef.current, [])
  const getHistoryId = React.useCallback(() => historyIdRef.current, [])
  const submitWithCurrentState = React.useCallback(
    (params: any) => onSubmitRef.current(params),
    []
  )

  const regenerateLastMessage = React.useMemo(
    () =>
      createRegenerateLastMessage({
        validateBeforeSubmitFn: () => true,
        history: getHistory,
        messages: getMessages,
        setHistory,
        setMessages,
        historyId: getHistoryId,
        removeMessageUsingHistoryIdFn: removeMessageUsingHistoryId,
        onSubmit: submitWithCurrentState
      }),
    [
      getHistory,
      getMessages,
      setHistory,
      setMessages,
      getHistoryId,
      submitWithCurrentState
    ]
  )
  const createChatBranch = React.useMemo(
    () =>
      createBranchMessage({
        historyId: null,
        getHistoryId,
        setHistory,
        setHistoryId,
        setMessages,
        setSelectedSystemPrompt,
        setSystemPrompt: currentChatModelSettings.setSystemPrompt
      }),
    [
      setHistory,
      setHistoryId,
      setMessages,
      getHistoryId,
      setSelectedSystemPrompt,
      currentChatModelSettings.setSystemPrompt
    ]
  )
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
    history,
    createChatBranch,
    temporaryChat,
    setTemporaryChat,
    sidepanelTemporaryChat,
    actionInfo
  }
}
