import React from "react"
import { cleanUrl } from "~libs/clean-url"
import { getOllamaURL, isOllamaRunning } from "~services/ollama"
import { useStoreMessage, type ChatHistory } from "~store"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { HumanMessage, AIMessage } from "@langchain/core/messages"

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
  }[]
) => {
  let history = []
  for (const message of messages) {
    if (message.role === "user") {
      history.push(
        new HumanMessage({
          content: [
            {
              type: "text",
              text: message.content
            }
          ]
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

export const useMessage = () => {
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
    setSelectedModel
  } = useStoreMessage()

  const abortControllerRef = React.useRef<AbortController | null>(null)

  const clearChat = () => {
    stopStreamingRequest()
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
  }

  const normalChatMode = async (message: string) => {
    const url = await getOllamaURL()

    abortControllerRef.current = new AbortController()

    const ollama = new ChatOllama({
      model: selectedModel,
      baseUrl: cleanUrl(url)
    })

    let newMessage = [
      ...messages,
      {
        isBot: false,
        message,
        sources: []
      },
      {
        isBot: true,
        message: "▋",
        sources: []
      }
    ]

    const appendingIndex = newMessage.length - 1
    setMessages(newMessage)

    try {
      const chunks = await ollama.stream(
        [
          ...generateHistory(history),
          new HumanMessage({
            content: [
              {
                type: "text",
                text: message
              }
            ]
          })
        ],
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
          content: message
        },
        {
          role: "assistant",
          content: newMessage[appendingIndex].message
        }
      ])

      setIsProcessing(false)
    } catch (e) {
      console.log(e)
      setIsProcessing(false)
      setStreaming(false)

      setMessages([
        ...messages,
        {
          isBot: true,
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

  const onSubmit = async (message: string) => {
    await normalChatMode(message)
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
    setSelectedModel
  }
}
