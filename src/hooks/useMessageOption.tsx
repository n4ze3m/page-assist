import React from "react"
import { cleanUrl } from "~libs/clean-url"
import { getOllamaURL, systemPromptForNonRagOption } from "~services/ollama"
import { type ChatHistory, type Message } from "~store/option"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import {
  HumanMessage,
  AIMessage,
  type MessageContent,
  SystemMessage
} from "@langchain/core/messages"
import { useStoreMessageOption } from "~store/option"
import { saveHistory, saveMessage } from "~libs/db"
import { useNavigate } from "react-router-dom"

export type BotResponse = {
  bot: {
    text: string
    sourceDocuments: any[]
  }
  history: ChatHistory
  history_id: string
}

const generateHistory = (
  messages: {
    role: "user" | "assistant" | "system"
    content: string
    image?: string
  }[]
) => {
  let history = []
  for (const message of messages) {
    if (message.role === "user") {
      let content: MessageContent = [
        {
          type: "text",
          text: message.content
        }
      ]

      if (message.image) {
        content = [
          {
            type: "image_url",
            image_url: message.image
          },
          {
            type: "text",
            text: message.content
          }
        ]
      }
      history.push(
        new HumanMessage({
          content: content
        })
      )
    } else if (message.role === "assistant") {
      history.push(
        new AIMessage({
          content: [
            {
              type: "text",
              text: message.content
            }
          ]
        })
      )
    }
  }
  return history
}

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
    setSpeechToTextLanguage
  } = useStoreMessageOption()

  const navigate = useNavigate()

  const abortControllerRef = React.useRef<AbortController | null>(null)

  const clearChat = () => {
    // stopStreamingRequest()
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
    setIsLoading(false)
    setIsProcessing(false)
    setStreaming(false)
    navigate("/")
  }

  const normalChatMode = async (message: string, image: string) => {
    const url = await getOllamaURL()

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(",")[1]}`
    }
    abortControllerRef.current = new AbortController()

    const ollama = new ChatOllama({
      model: selectedModel,
      baseUrl: cleanUrl(url)
    })

    let newMessage: Message[] = [
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

    const appendingIndex = newMessage.length - 1
    setMessages(newMessage)

    try {
      const prompt = await systemPromptForNonRagOption()

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

      setIsProcessing(false)
    } catch (e) {
      setIsProcessing(false)
      setStreaming(false)

      setMessages([
        ...messages,
        {
          isBot: true,
          name: selectedModel,
          message: `Something went wrong. Check out the following logs:
        \`\`\`
        ${e?.message}
        \`\`\`
        `,
          sources: []
        }
      ])
    }
  }

  const onSubmit = async ({
    message,
    image
  }: {
    message: string
    image: string
  }) => {
    await normalChatMode(message, image)
  }

  const stopStreamingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
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
    speechToTextLanguage,
    setSpeechToTextLanguage
  }
}
