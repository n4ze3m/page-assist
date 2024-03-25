import React from "react"
import { cleanUrl } from "~/libs/clean-url"
import {
  geWebSearchFollowUpPrompt,
  getOllamaURL,
  systemPromptForNonRagOption
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { useStoreMessageOption } from "~/store/option"
import {
  deleteChatForEdit,
  getPromptById,
  removeMessageUsingHistoryId,
  saveHistory,
  saveMessage,
  updateMessageByIndex
} from "~/libs/db"
import { useNavigate } from "react-router-dom"
import { notification } from "antd"
import { getSystemPromptForWeb } from "~/web/web"
import { generateHistory } from "@/utils/generate-history"
import { useTranslation } from "react-i18next"

export const useMessageOption = () => {
  const {
    history,
    messages,
    setHistory,
    setMessages,
    setStreaming,
    streaming,
    setIsFirstMessage,
    historyId,
    setHistoryId,
    isLoading,
    setIsLoading,
    isProcessing,
    setIsProcessing,
    selectedModel,
    setSelectedModel,
    chatMode,
    setChatMode,
    speechToTextLanguage,
    setSpeechToTextLanguage,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    setIsSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt
  } = useStoreMessageOption()

  const { t } = useTranslation("option")

  const navigate = useNavigate()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const abortControllerRef = React.useRef<AbortController | null>(null)

  const clearChat = () => {
    navigate("/")
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
    setIsLoading(false)
    setIsProcessing(false)
    setStreaming(false)
    textareaRef?.current?.focus()
  }

  const searchChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory
  ) => {
    const url = await getOllamaURL()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }
    abortControllerRef.current = new AbortController()

    const ollama = new ChatOllama({
      model: selectedModel!,
      baseUrl: cleanUrl(url)
    })

    let newMessage: Message[] = []
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
          sources: []
        }
      ]
    } else {
      newMessage = [
        ...messages,
        {
          isBot: true,
          name: selectedModel,
          message: "▋",
          sources: []
        }
      ]
    }
    setMessages(newMessage)
    const appendingIndex = newMessage.length - 1

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
        const questionOllama = new ChatOllama({
          model: selectedModel!,
          baseUrl: cleanUrl(url)
        })
        const response = await questionOllama.invoke(promptForQuestion)
        query = response.content.toString()
      }

      const { prompt, source } = await getSystemPromptForWeb(query)
      setIsSearchingInternet(false)

      message = message.trim().replaceAll("\n", " ")

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
          signal: abortControllerRef.current.signal
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        if (count === 0) {
          setIsProcessing(true)
          newMessage[appendingIndex].message = chunk.content + "▋"
          setMessages(newMessage)
        } else {
          newMessage[appendingIndex].message =
            newMessage[appendingIndex].message.slice(0, -1) +
            chunk.content +
            "▋"
          setMessages(newMessage)
        }

        count++
      }

      newMessage[appendingIndex].message = newMessage[
        appendingIndex
      ].message.slice(0, -1)

      newMessage[appendingIndex].sources = source

      if (!isRegenerate) {
        setHistory([
          ...history,
          {
            role: "user",
            content: message,
            image
          },
          {
            role: "assistant",
            content: newMessage[appendingIndex].message
          }
        ])
      } else {
        setHistory([
          ...history,
          {
            role: "assistant",
            content: newMessage[appendingIndex].message
          }
        ])
      }

      if (historyId) {
        if (!isRegenerate) {
          await saveMessage(historyId, selectedModel!, "user", message, [image])
        }
        await saveMessage(
          historyId,
          selectedModel!,
          "assistant",
          newMessage[appendingIndex].message,
          [],
          source
        )
      } else {
        const newHistoryId = await saveHistory(message)
        await saveMessage(newHistoryId.id, selectedModel!, "user", message, [
          image
        ])
        await saveMessage(
          newHistoryId.id,
          selectedModel!,
          "assistant",
          newMessage[appendingIndex].message,
          [],
          source
        )
        setHistoryId(newHistoryId.id)
      }

      setIsProcessing(false)
      setStreaming(false)
    } catch (e) {
      //@ts-ignore
      if (e?.name === "AbortError") {
        newMessage[appendingIndex].message = newMessage[
          appendingIndex
        ].message.slice(0, -1)

        setHistory([
          ...history,
          {
            role: "user",
            content: message,
            image
          },
          {
            role: "assistant",
            content: newMessage[appendingIndex].message
          }
        ])

        if (historyId) {
          await saveMessage(historyId, selectedModel!, "user", message, [image])
          await saveMessage(
            historyId,
            selectedModel!,
            "assistant",
            newMessage[appendingIndex].message,
            []
          )
        } else {
          const newHistoryId = await saveHistory(message)
          await saveMessage(newHistoryId.id, selectedModel!, "user", message, [
            image
          ])
          await saveMessage(
            newHistoryId.id,
            selectedModel!,
            "assistant",
            newMessage[appendingIndex].message,
            []
          )
          setHistoryId(newHistoryId.id)
        }
      } else {
        //@ts-ignore
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }

      setIsProcessing(false)
      setStreaming(false)
    }
  }

  const normalChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Message[],
    history: ChatHistory
  ) => {
    const url = await getOllamaURL()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }
    abortControllerRef.current = new AbortController()

    const ollama = new ChatOllama({
      model: selectedModel!,
      baseUrl: cleanUrl(url)
    })

    let newMessage: Message[] = []
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
          sources: []
        }
      ]
    } else {
      newMessage = [
        ...messages,
        {
          isBot: true,
          name: selectedModel,
          message: "▋",
          sources: []
        }
      ]
    }
    setMessages(newMessage)
    const appendingIndex = newMessage.length - 1

    try {
      const prompt = await systemPromptForNonRagOption()
      const selectedPrompt = await getPromptById(selectedSystemPrompt)

      message = message.trim().replaceAll("\n", " ")

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

      if (prompt && !selectedPrompt) {
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

      if (selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: [
              {
                text: selectedPrompt.content,
                type: "text"
              }
            ]
          })
        )
      }

      const chunks = await ollama.stream(
        [...applicationChatHistory, humanMessage],
        {
          signal: abortControllerRef.current.signal
        }
      )
      let count = 0
      for await (const chunk of chunks) {
        if (count === 0) {
          setIsProcessing(true)
          newMessage[appendingIndex].message = chunk.content + "▋"
          setMessages(newMessage)
        } else {
          newMessage[appendingIndex].message =
            newMessage[appendingIndex].message.slice(0, -1) +
            chunk.content +
            "▋"
          setMessages(newMessage)
        }

        count++
      }

      newMessage[appendingIndex].message = newMessage[
        appendingIndex
      ].message.slice(0, -1)

      if (!isRegenerate) {
        setHistory([
          ...history,
          {
            role: "user",
            content: message,
            image
          },
          {
            role: "assistant",
            content: newMessage[appendingIndex].message
          }
        ])
      } else {
        setHistory([
          ...history,
          {
            role: "assistant",
            content: newMessage[appendingIndex].message
          }
        ])
      }

      if (historyId) {
        if (!isRegenerate) {
          await saveMessage(historyId, selectedModel, "user", message, [image])
        }
        await saveMessage(
          historyId,
          selectedModel,
          "assistant",
          newMessage[appendingIndex].message,
          []
        )
      } else {
        const newHistoryId = await saveHistory(message)
        await saveMessage(newHistoryId.id, selectedModel, "user", message, [
          image
        ])
        await saveMessage(
          newHistoryId.id,
          selectedModel,
          "assistant",
          newMessage[appendingIndex].message,
          []
        )
        setHistoryId(newHistoryId.id)
      }

      setIsProcessing(false)
      setStreaming(false)
    } catch (e) {
      if (e?.name === "AbortError") {
        newMessage[appendingIndex].message = newMessage[
          appendingIndex
        ].message.slice(0, -1)

        setHistory([
          ...history,
          {
            role: "user",
            content: message,
            image
          },
          {
            role: "assistant",
            content: newMessage[appendingIndex].message
          }
        ])

        if (historyId) {
          await saveMessage(historyId, selectedModel, "user", message, [image])
          await saveMessage(
            historyId,
            selectedModel,
            "assistant",
            newMessage[appendingIndex].message,
            []
          )
        } else {
          const newHistoryId = await saveHistory(message)
          await saveMessage(newHistoryId.id, selectedModel, "user", message, [
            image
          ])
          await saveMessage(
            newHistoryId.id,
            selectedModel,
            "assistant",
            newMessage[appendingIndex].message,
            []
          )
          setHistoryId(newHistoryId.id)
        }
      } else {
        notification.error({
          message: t("error"),
          description: e?.message || t("somethingWentWrong")
        })
      }

      setIsProcessing(false)
      setStreaming(false)
    }
  }

  const onSubmit = async ({
    message,
    image,
    isRegenerate = false,
    messages: chatHistory,
    memory
  }: {
    message: string
    image: string
    isRegenerate?: boolean
    messages?: Message[]
    memory?: ChatHistory
  }) => {
    setStreaming(true)
    if (webSearch) {
      await searchChatMode(
        message,
        image,
        isRegenerate,
        chatHistory || messages,
        memory || history
      )
    } else {
      await normalChatMode(
        message,
        image,
        isRegenerate,
        chatHistory || messages,
        memory || history
      )
    }
  }

  const regenerateLastMessage = async () => {
    const isOk = validateBeforeSubmit()

    if (!isOk) {
      return
    }
    if (history.length > 0) {
      const lastMessage = history[history.length - 2]
      let newHistory = history
      let mewMessages = messages
      newHistory.pop()
      mewMessages.pop()
      setHistory(newHistory)
      setMessages(mewMessages)
      await removeMessageUsingHistoryId(historyId)
      if (lastMessage.role === "user") {
        await onSubmit({
          message: lastMessage.content,
          image: lastMessage.image || "",
          isRegenerate: true,
          memory: newHistory
        })
      }
    }
  }

  const stopStreamingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
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
    isHuman: boolean
  ) => {
    // update message and history by index
    let newMessages = messages
    let newHistory = history

    if (isHuman) {
      const isOk = validateBeforeSubmit()

      if (!isOk) {
        return
      }

      const currentHumanMessage = newMessages[index]
      newMessages[index].message = message
      newHistory[index].content = message
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index + 1)
      setHistory(previousHistory)
      await updateMessageByIndex(historyId, index, message)
      await deleteChatForEdit(historyId, index)
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory
      })
    } else {
      newMessages[index].message = message
      setMessages(newMessages)
      newHistory[index].content = message
      setHistory(newHistory)
      await updateMessageByIndex(historyId, index, message)
    }
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
    textareaRef
  }
}
