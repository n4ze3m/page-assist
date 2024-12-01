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
import { SystemMessage } from "@langchain/core/messages"
import { getDataFromCurrentTab } from "~/libs/get-html"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { memoryEmbedding } from "@/utils/memory-embeddings"
import { ChatHistory } from "@/store/option"
import {
  deleteChatForEdit,
  generateID,
  getPromptById,
  removeMessageUsingHistoryId,
  updateMessageByIndex
} from "@/db"
import { saveMessageOnError, saveMessageOnSuccess } from "./chat-helper"
import { notification } from "antd"
import { useTranslation } from "react-i18next"
import { usePageAssist } from "@/context"
import { formatDocs } from "@/chain/chat-with-x"
import { useStorage } from "@plasmohq/storage/hook"
import { useStoreChatModelSettings } from "@/store/model"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { getSystemPromptForWeb } from "@/web/web"
import { pageAssistModel } from "@/models"
import { getPrompt } from "@/services/application"
import { humanMessageFormatter } from "@/utils/human-message"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"
import { PAMemoryVectorStore } from "@/libs/PAMemoryVectorStore"
import { getScreenshotFromCurrentTab } from "@/libs/get-screenshot"

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
    isSearchingInternet
  } = useStoreMessageOption()

  const [chatWithWebsiteEmbedding] = useStorage(
    "chatWithWebsiteEmbedding",
    true
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
    setSelectedSystemPrompt
  } = useStoreMessage()

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
    currentChatModelSettings.reset()
  }

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
      baseUrl: cleanUrl(url),
      keepAlive:
        currentChatModelSettings?.keepAlive ??
        userDefaultModelSettings?.keepAlive,
      temperature:
        currentChatModelSettings?.temperature ??
        userDefaultModelSettings?.temperature,
      topK: currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
      topP: currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
      numCtx:
        currentChatModelSettings?.numCtx ?? userDefaultModelSettings?.numCtx,
      seed: currentChatModelSettings?.seed,
      numGpu:
        currentChatModelSettings?.numGpu ?? userDefaultModelSettings?.numGpu,
      numPredict:
        currentChatModelSettings?.numPredict ??
        userDefaultModelSettings?.numPredict,
      useMMap:
        currentChatModelSettings?.useMMap ?? userDefaultModelSettings?.useMMap
    })

    let newMessage: Message[] = []
    let generateMessageId = generateID()

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
          id: generateMessageId
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
          id: generateMessageId
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
    } = await getDataFromCurrentTab()

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
          baseUrl: cleanUrl(url),
          keepAlive:
            currentChatModelSettings?.keepAlive ??
            userDefaultModelSettings?.keepAlive,
          temperature:
            currentChatModelSettings?.temperature ??
            userDefaultModelSettings?.temperature,
          topK:
            currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
          topP:
            currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
          numCtx:
            currentChatModelSettings?.numCtx ??
            userDefaultModelSettings?.numCtx,
          seed: currentChatModelSettings?.seed,
          numGpu:
            currentChatModelSettings?.numGpu ??
            userDefaultModelSettings?.numGpu,
          numPredict:
            currentChatModelSettings?.numPredict ??
            userDefaultModelSettings?.numPredict,
          useMMap:
            currentChatModelSettings?.useMMap ??
            userDefaultModelSettings?.useMMap
        })
        const response = await questionOllama.invoke(promptForQuestion)
        query = response.content.toString()
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
        const docs = await vectorstore.similaritySearch(query, 4)
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

      let humanMessage = humanMessageFormatter({
        content: [
          {
            text: systemPrompt
              .replace("{context}", context)
              .replace("{question}", query),
            type: "text"
          }
        ],
        model: selectedModel
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
                  console.log("handleLLMEnd error", e)
                }
              }
            }
          ]
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk?.content
        fullText += chunk?.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText + "▋"
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
              generationInfo
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
        generationInfo
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
    const userDefaultModelSettings = await getAllDefaultModelSettings()

    const ollama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url),
      keepAlive:
        currentChatModelSettings?.keepAlive ??
        userDefaultModelSettings?.keepAlive,
      temperature:
        currentChatModelSettings?.temperature ??
        userDefaultModelSettings?.temperature,
      topK: currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
      topP: currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
      numCtx:
        currentChatModelSettings?.numCtx ?? userDefaultModelSettings?.numCtx,
      seed: currentChatModelSettings?.seed,
      numGpu:
        currentChatModelSettings?.numGpu ?? userDefaultModelSettings?.numGpu,
      numPredict:
        currentChatModelSettings?.numPredict ??
        userDefaultModelSettings?.numPredict,
      useMMap:
        currentChatModelSettings?.useMMap ?? userDefaultModelSettings?.useMMap
    })

    let newMessage: Message[] = []
    let generateMessageId = generateID()

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
          id: generateMessageId
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
          id: generateMessageId
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
      console.log(
        data?.success
          ? `[PageAssist] Screenshot is taken`
          : `[PageAssist] Screenshot is not taken`
      )
      const visionImage = data?.screenshot || ""

      if (visionImage === "") {
        throw new Error(
          "Please close and reopen the side panel. This is a bug that will be fixed soon."
        )
      }

      if (prompt && !selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: prompt
          })
        )
      }
      if (selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: selectedPrompt.content
          })
        )
      }

      let humanMessage = humanMessageFormatter({
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
        model: selectedModel
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
                  console.log("handleLLMEnd error", e)
                }
              }
            }
          ]
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk?.content
        fullText += chunk?.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText + "▋"
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
              generationInfo
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
        generationInfo
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
    signal: AbortSignal
  ) => {
    setStreaming(true)
    const url = await getOllamaURL()
    const userDefaultModelSettings = await getAllDefaultModelSettings()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    const ollama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url),
      keepAlive:
        currentChatModelSettings?.keepAlive ??
        userDefaultModelSettings?.keepAlive,
      temperature:
        currentChatModelSettings?.temperature ??
        userDefaultModelSettings?.temperature,
      topK: currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
      topP: currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
      numCtx:
        currentChatModelSettings?.numCtx ?? userDefaultModelSettings?.numCtx,
      seed: currentChatModelSettings?.seed,
      numGpu:
        currentChatModelSettings?.numGpu ?? userDefaultModelSettings?.numGpu,
      numPredict:
        currentChatModelSettings?.numPredict ??
        userDefaultModelSettings?.numPredict,
      useMMap:
        currentChatModelSettings?.useMMap ?? userDefaultModelSettings?.useMMap
    })

    let newMessage: Message[] = []
    let generateMessageId = generateID()

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
          id: generateMessageId
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
          id: generateMessageId
        }
      ]
    }
    setMessages(newMessage)
    let fullText = ""
    let contentToSave = ""

    try {
      const prompt = await systemPromptForNonRag()
      const selectedPrompt = await getPromptById(selectedSystemPrompt)

      let humanMessage = humanMessageFormatter({
        content: [
          {
            text: message,
            type: "text"
          }
        ],
        model: selectedModel
      })
      if (image.length > 0) {
        humanMessage = humanMessageFormatter({
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
          model: selectedModel
        })
      }

      const applicationChatHistory = generateHistory(history, selectedModel)

      if (prompt && !selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: prompt
          })
        )
      }
      if (selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
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
                  console.log("handleLLMEnd error", e)
                }
              }
            }
          ]
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk?.content
        fullText += chunk?.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText + "▋"
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
              generationInfo
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
        message_source: "copilot",
        generationInfo
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
    signal: AbortSignal
  ) => {
    const url = await getOllamaURL()
    setStreaming(true)
    const userDefaultModelSettings = await getAllDefaultModelSettings()
    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    const ollama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url),
      keepAlive:
        currentChatModelSettings?.keepAlive ??
        userDefaultModelSettings?.keepAlive,
      temperature:
        currentChatModelSettings?.temperature ??
        userDefaultModelSettings?.temperature,
      topK: currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
      topP: currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
      numCtx:
        currentChatModelSettings?.numCtx ?? userDefaultModelSettings?.numCtx,
      seed: currentChatModelSettings?.seed,
      numGpu:
        currentChatModelSettings?.numGpu ?? userDefaultModelSettings?.numGpu,
      numPredict:
        currentChatModelSettings?.numPredict ??
        userDefaultModelSettings?.numPredict,
      useMMap:
        currentChatModelSettings?.useMMap ?? userDefaultModelSettings?.useMMap
    })

    let newMessage: Message[] = []
    let generateMessageId = generateID()

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
          id: generateMessageId
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
          id: generateMessageId
        }
      ]
    }
    setMessages(newMessage)
    let fullText = ""
    let contentToSave = ""

    try {
      setIsSearchingInternet(true)

      let query = message

      if (newMessage.length > 2) {
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
        const questionOllama = await pageAssistModel({
          model: selectedModel!,
          baseUrl: cleanUrl(url),
          keepAlive:
            currentChatModelSettings?.keepAlive ??
            userDefaultModelSettings?.keepAlive,
          temperature:
            currentChatModelSettings?.temperature ??
            userDefaultModelSettings?.temperature,
          topK:
            currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
          topP:
            currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
          numCtx:
            currentChatModelSettings?.numCtx ??
            userDefaultModelSettings?.numCtx,
          seed: currentChatModelSettings?.seed,
          numGpu:
            currentChatModelSettings?.numGpu ??
            userDefaultModelSettings?.numGpu,
          numPredict:
            currentChatModelSettings?.numPredict ??
            userDefaultModelSettings?.numPredict,
          useMMap:
            currentChatModelSettings?.useMMap ??
            userDefaultModelSettings?.useMMap
        })
        const response = await questionOllama.invoke(promptForQuestion)
        query = response.content.toString()
      }

      const { prompt, source } = await getSystemPromptForWeb(query)
      setIsSearchingInternet(false)

      //  message = message.trim().replaceAll("\n", " ")

      let humanMessage = humanMessageFormatter({
        content: [
          {
            text: message,
            type: "text"
          }
        ],
        model: selectedModel
      })
      if (image.length > 0) {
        humanMessage = humanMessageFormatter({
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
          model: selectedModel
        })
      }

      const applicationChatHistory = generateHistory(history, selectedModel)

      if (prompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
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
                  console.log("handleLLMEnd error", e)
                }
              }
            }
          ]
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk?.content
        fullText += chunk?.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText + "▋"
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
              generationInfo
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
        generationInfo
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
    messageType: string
  ) => {
    setStreaming(true)
    const url = await getOllamaURL()
    const userDefaultModelSettings = await getAllDefaultModelSettings()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    const ollama = await pageAssistModel({
      model: selectedModel!,
      baseUrl: cleanUrl(url),
      keepAlive:
        currentChatModelSettings?.keepAlive ??
        userDefaultModelSettings?.keepAlive,
      temperature:
        currentChatModelSettings?.temperature ??
        userDefaultModelSettings?.temperature,
      topK: currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
      topP: currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
      numCtx:
        currentChatModelSettings?.numCtx ?? userDefaultModelSettings?.numCtx,
      seed: currentChatModelSettings?.seed,
      numGpu:
        currentChatModelSettings?.numGpu ?? userDefaultModelSettings?.numGpu,
      numPredict:
        currentChatModelSettings?.numPredict ??
        userDefaultModelSettings?.numPredict,
      useMMap:
        currentChatModelSettings?.useMMap ?? userDefaultModelSettings?.useMMap
    })

    let newMessage: Message[] = []
    let generateMessageId = generateID()

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
          id: generateMessageId
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
          id: generateMessageId
        }
      ]
    }
    setMessages(newMessage)
    let fullText = ""
    let contentToSave = ""

    try {
      const prompt = await getPrompt(messageType)
      let humanMessage = humanMessageFormatter({
        content: [
          {
            text: prompt.replace("{text}", message),
            type: "text"
          }
        ],
        model: selectedModel
      })
      if (image.length > 0) {
        humanMessage = humanMessageFormatter({
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
          model: selectedModel
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
                console.log("handleLLMEnd error", e)
              }
            }
          }
        ]
      })
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk?.content
        fullText += chunk?.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText + "▋"
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
              generationInfo
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
        generationInfo
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
        if (webSearch) {
          await searchChatMode(
            message,
            image,
            isRegenerate || false,
            messages,
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
    let newMessages = messages
    let newHistory = history

    if (isHuman) {
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
    } else {
      newMessages[index].message = message
      setMessages(newMessages)
      newHistory[index].content = message
      setHistory(newHistory)
      await updateMessageByIndex(historyId, index, message)
    }
  }

  const regenerateLastMessage = async () => {
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
          controller: newController,
          messageType: lastMessage.messageType
        })
      }
    }
  }

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
    setSpeechToTextLanguage
  }
}
