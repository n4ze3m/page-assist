import React from "react"
import { cleanUrl } from "~/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  getOllamaURL,
  promptForRag,
  systemPromptForNonRag
} from "~/services/ollama"
import { type Message } from "~/store/option"
import { useStoreMessage } from "~/store"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getDataFromCurrentTab } from "~/libs/get-html"
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { memoryEmbedding } from "@/utils/memory-embeddings"
import { ChatHistory } from "@/store/option"
import { generateID } from "@/db"
import { saveMessageOnError, saveMessageOnSuccess } from "./chat-helper"
import { notification } from "antd"
import { useTranslation } from "react-i18next"
import { usePageAssist } from "@/context"
import { formatDocs } from "@/chain/chat-with-x"
import { OllamaEmbeddingsPageAssist } from "@/models/OllamaEmbedding"
import { useStorage } from "@plasmohq/storage/hook"

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
    speechToTextLanguage,
    setSpeechToTextLanguage,
    currentURL,
    setCurrentURL
  } = useStoreMessage()

  const [keepTrackOfEmbedding, setKeepTrackOfEmbedding] = React.useState<{
    [key: string]: MemoryVectorStore
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

    const ollama = new ChatOllama({
      model: selectedModel!,
      baseUrl: cleanUrl(url)
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
    let isAlreadyExistEmbedding: MemoryVectorStore
    let embedURL: string, embedHTML: string, embedType: string
    let embedPDF: { content: string; page: number }[] = []

    if (messages.length === 0) {
      const { content: html, url, type, pdf } = await getDataFromCurrentTab()
      embedHTML = html
      embedURL = url
      embedType = type
      embedPDF = pdf
      setCurrentURL(url)
      isAlreadyExistEmbedding = keepTrackOfEmbedding[currentURL]
    } else {
      isAlreadyExistEmbedding = keepTrackOfEmbedding[currentURL]
      embedURL = currentURL
    }

    setMessages(newMessage)
    const ollamaUrl = await getOllamaURL()
    const embeddingModle = await defaultEmbeddingModelForRag()

    const ollamaEmbedding = new OllamaEmbeddingsPageAssist({
      model: embeddingModle || selectedModel,
      baseUrl: cleanUrl(ollamaUrl),
      signal: embeddingSignal
    })
    let vectorstore: MemoryVectorStore

    try {
      if (isAlreadyExistEmbedding) {
        vectorstore = isAlreadyExistEmbedding
      } else {
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
        const questionOllama = new ChatOllama({
          model: selectedModel!,
          baseUrl: cleanUrl(url)
        })
        const response = await questionOllama.invoke(promptForQuestion)
        query = response.content.toString()
      }

      const docs = await vectorstore.similaritySearch(query, 4)
      const context = formatDocs(docs)
      const source = docs.map((doc) => {
        return {
          ...doc,
          name: doc?.metadata?.source || "untitled",
          type: doc?.metadata?.type || "unknown",
          mode: "chat",
          url: ""
        }
      })
     // message = message.trim().replaceAll("\n", " ")

      let humanMessage = new HumanMessage({
        content: [
          {
            text: systemPrompt
              .replace("{context}", context)
              .replace("{question}", message),
            type: "text"
          }
        ]
      })

      const applicationChatHistory = generateHistory(history)

      const chunks = await ollama.stream(
        [...applicationChatHistory, humanMessage],
        {
          signal: signal
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk.content
        fullText += chunk.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText.slice(0, -1) + "▋"
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
              sources: source
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
        source
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

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }

    const ollama = new ChatOllama({
      model: selectedModel!,
      baseUrl: cleanUrl(url),
      verbose: true
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

      let humanMessage = new HumanMessage({
        content: [
          {
            text: message,
            type: "text"
          }
        ]
      })
      if (image.length > 0) {
        humanMessage = new HumanMessage({
          content: [
            {
              text: message,
              type: "text"
            },
            {
              image_url: image,
              type: "image_url"
            }
          ]
        })
      }

      const applicationChatHistory = generateHistory(history)

      if (prompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: [
              {
                text: prompt,
                type: "text"
              }
            ]
          })
        )
      }

      const chunks = await ollama.stream(
        [...applicationChatHistory, humanMessage],
        {
          signal: signal
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        contentToSave += chunk.content
        fullText += chunk.content
        if (count === 0) {
          setIsProcessing(true)
        }
        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id === generateMessageId) {
              return {
                ...message,
                message: fullText.slice(0, -1) + "▋"
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
              message: fullText.slice(0, -1)
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
        source: []
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
    image
  }: {
    message: string
    image: string
  }) => {
    const newController = new AbortController()
    let signal = newController.signal
    setAbortController(newController)

    if (chatMode === "normal") {
      await normalChatMode(message, image, false, messages, history, signal)
    } else {
      const newEmbeddingController = new AbortController()
      let embeddingSignal = newEmbeddingController.signal
      setEmbeddingController(newEmbeddingController)
      await chatWithWebsiteMode(
        message,
        image,
        false,
        messages,
        history,
        signal,
        embeddingSignal
      )
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
  return {
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
    isEmbedding,
    speechToTextLanguage,
    setSpeechToTextLanguage
  }
}
