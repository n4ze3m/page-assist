import React from "react"
import { cleanUrl } from "~/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  geWebSearchFollowUpPrompt,
  getOllamaURL,
  promptForRag,
  systemPromptForNonRagOption
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { useStoreMessageOption } from "~/store/option"
import {
  deleteChatForEdit,
  generateID,
  getPromptById,
  removeMessageUsingHistoryId,
  updateMessageByIndex
} from "@/db"
import { useNavigate } from "react-router-dom"
import { notification } from "antd"
import { getSystemPromptForWeb, isQueryHaveWebsite } from "~/web/web"
import { generateHistory } from "@/utils/generate-history"
import { useTranslation } from "react-i18next"
import {
  saveMessageOnError as saveError,
  saveMessageOnSuccess as saveSuccess
} from "./chat-helper"
import { usePageAssist } from "@/context"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"
import { formatDocs } from "@/chain/chat-with-x"
import { useWebUI } from "@/store/webui"
import { useStorage } from "@plasmohq/storage/hook"
import { useStoreChatModelSettings } from "@/store/model"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { pageAssistModel } from "@/models"
import { getNoOfRetrievedDocs } from "@/services/app"
import { humanMessageFormatter } from "@/utils/human-message"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent,
  removeReasoning
} from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import { isChatWithWebsiteEnabled } from "@/services/kb"

export const useMessageOption = () => {
  const {
    controller: abortController,
    setController: setAbortController,
    messages,
    setMessages
  } = usePageAssist()
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
    webSearch,
    setWebSearch,
    isSearchingInternet,
    setIsSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    selectedKnowledge,
    setSelectedKnowledge,
    temporaryChat,
    setTemporaryChat,
    useOCR,
    setUseOCR
  } = useStoreMessageOption()
  const currentChatModelSettings = useStoreChatModelSettings()
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const [defaultInternetSearchOn] = useStorage("defaultInternetSearchOn", false)
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )
  const { ttsEnabled } = useWebUI()

  const { t } = useTranslation("option")

  const navigate = useNavigate()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const focusTextArea = () => {
    try {
      if (textareaRef.current) {
        textareaRef.current.focus()
      } else {
        const textareaElement = document.getElementById(
          "textarea-message"
        ) as HTMLTextAreaElement
        if (textareaElement) {
          textareaElement.focus()
        }
      }
    } catch (e) {}
  }

  const clearChat = () => {
    navigate("/")
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
    setIsLoading(false)
    setIsProcessing(false)
    setStreaming(false)
    currentChatModelSettings.reset()
    // textareaRef?.current?.focus()
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
    focusTextArea()
  }

  const searchChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal
  ) => {
    const url = await getOllamaURL()
    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

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
          images: [image]
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
    let timetaken = 0

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

      if (image.length > 0) {
        questionMessage = await humanMessageFormatter({
          content: [
            {
              text: promptForQuestion,
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

  const saveMessageOnSuccess = async (e: any) => {
    if (!temporaryChat) {
      return await saveSuccess(e)
    } else {
      setHistoryId("temp")
    }

    return true
  }

  const saveMessageOnError = async (e: any) => {
    if (!temporaryChat) {
      return await saveError(e)
    } else {
      setHistory([
        ...history,
        {
          role: "user",
          content: e.userMessage,
          image: e.image
        },
        {
          role: "assistant",
          content: e.botMessage
        }
      ])

      setHistoryId("temp")
    }

    return true
  }

  const normalChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal
  ) => {
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
          modelImage: modelInfo?.model_avatar,
          modelName: modelInfo?.model_name || selectedModel
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
    let timetaken = 0

    try {
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
      let apiReasoning: boolean = false

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

        if (count === 0) {
          setIsProcessing(true)
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
        prompt_content: promptContent,
        prompt_id: promptId
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

  const continueChatMode = async (
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal
  ) => {
    const url = await getOllamaURL()
    let promptId: string | undefined = selectedSystemPrompt
    let promptContent: string | undefined = undefined

    const ollama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url)
    })

    let newMessage: Message[] = []

    const lastMessage = messages[messages.length - 1]
    let generateMessageId = lastMessage.id
    newMessage = [...messages]
    newMessage[newMessage.length - 1] = {
      ...lastMessage,
      message: lastMessage.message + "▋"
    }
    setMessages(newMessage)
    let fullText = lastMessage.message
    let contentToSave = ""
    let timetaken = 0

    try {
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

      let generationInfo: any | undefined = undefined

      const chunks = await ollama.stream([...applicationChatHistory], {
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
      let apiReasoning: boolean = false
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

        if (count === 0) {
          setIsProcessing(true)
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

      let newHistory = [...history]

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
      setIsProcessing(false)
      setStreaming(false)
    } catch (e) {
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

  const ragMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory,
    signal: AbortSignal
  ) => {
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
      const docSize = await getNoOfRetrievedDocs()
      const useVS = await isChatWithWebsiteEnabled()
      let context: string = ""
      let source: any[] = []
      if (useVS) {
        const docs = await vectorstore.similaritySearch(query, docSize)
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
      } else {
        const docs = await vectorstore.getAllPageContent()
        context = docs.pageContent
        source = docs.metadata.map((doc) => {
          return {
            ...doc,
            name: doc?.source || "untitled",
            type: doc?.type || "unknown",
            mode: "rag",
            url: ""
          }
        })
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
    isRegenerate = false,
    messages: chatHistory,
    memory,
    controller,
    isContinue
  }: {
    message: string
    image: string
    isRegenerate?: boolean
    isContinue?: boolean
    messages?: Message[]
    memory?: ChatHistory
    controller?: AbortController
  }) => {
    setStreaming(true)
    let signal: AbortSignal
    if (!controller) {
      const newController = new AbortController()
      signal = newController.signal
      setAbortController(newController)
    } else {
      setAbortController(controller)
      signal = controller.signal
    }

    if (isContinue) {
      await continueChatMode(chatHistory || messages, memory || history, signal)
      return
    }

    if (selectedKnowledge) {
      await ragMode(
        message,
        image,
        isRegenerate,
        chatHistory || messages,
        memory || history,
        signal
      )
    } else {
      if (webSearch) {
        await searchChatMode(
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
          signal
        )
      }
    }
  }

  const regenerateLastMessage = async () => {
    const isOk = validateBeforeSubmit()

    if (!isOk) {
      return
    }
    if (history.length > 0) {
      const lastMessage = history[history.length - 2]
      let newHistory = history.slice(0, -2)
      let mewMessages = messages
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
          controller: newController
        })
      }
    }
  }

  const stopStreamingRequest = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }

  const validateBeforeSubmit = () => {
    if (!selectedModel || selectedModel?.trim()?.length === 0) {
      notification.error({
        message: t("error"),
        description: t("validationSelectModel")
      })
      return false
    }

    return true
  }

  const editMessage = async (
    index: number,
    message: string,
    isHuman: boolean,
    isSend: boolean
  ) => {
    let newMessages = messages
    let newHistory = history

    // if human message and send then only trigger the submit
    if (isHuman && isSend) {
      const isOk = validateBeforeSubmit()

      if (!isOk) {
        return
      }

      const currentHumanMessage = newMessages[index]
      newMessages[index].message = message
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(historyId, index, message)
      await deleteChatForEdit(historyId, index)
      const abortController = new AbortController()
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController
      })
      return
    }
    newMessages[index].message = message
    setMessages(newMessages)
    newHistory[index].content = message
    setHistory(newHistory)
    await updateMessageByIndex(historyId, index, message)
  }

  return {
    editMessage,
    messages,
    setMessages,
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
    speechToTextLanguage,
    setSpeechToTextLanguage,
    regenerateLastMessage,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    setIsSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    textareaRef,
    selectedKnowledge,
    setSelectedKnowledge,
    ttsEnabled,
    temporaryChat,
    setTemporaryChat,
    useOCR,
    setUseOCR,
    defaultInternetSearchOn,
    history
  }
}
