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
import { SystemMessage } from "@langchain/core/messages"
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
import { getSystemPromptForWeb } from "~/web/web"
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
    setTemporaryChat
  } = useStoreMessageOption()
  const currentChatModelSettings = useStoreChatModelSettings()
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )
  const { ttsEnabled } = useWebUI()

  const { t } = useTranslation("option")

  const navigate = useNavigate()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

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
    textareaRef?.current?.focus()
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
    const userDefaultModelSettings = await getAllDefaultModelSettings()
    let promptId: string | undefined = selectedSystemPrompt
    let promptContent: string | undefined = undefined

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
      const prompt = await systemPromptForNonRagOption()
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

      const isTempSystemprompt =
        currentChatModelSettings.systemPrompt &&
        currentChatModelSettings.systemPrompt?.trim().length > 0

      if (!isTempSystemprompt && selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: selectedPrompt.content
          })
        )
        promptContent = selectedPrompt.content
      }

      if (isTempSystemprompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
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
        generationInfo,
        prompt_content: promptContent,
        prompt_id: promptId
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
      const docSize = await getNoOfRetrievedDocs()

      const docs = await vectorstore.similaritySearch(query, docSize)
      const context = formatDocs(docs)
      const source = docs.map((doc) => {
        return {
          ...doc,
          name: doc?.metadata?.source || "untitled",
          type: doc?.metadata?.type || "unknown",
          mode: "rag",
          url: ""
        }
      })
      //  message = message.trim().replaceAll("\n", " ")

      let humanMessage = humanMessageFormatter({
        content: [
          {
            text: systemPrompt
              .replace("{context}", context)
              .replace("{question}", message),
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

  const onSubmit = async ({
    message,
    image,
    isRegenerate = false,
    messages: chatHistory,
    memory,
    controller
  }: {
    message: string
    image: string
    isRegenerate?: boolean
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
    setTemporaryChat
  }
}
