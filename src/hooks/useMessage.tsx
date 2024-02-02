import React from "react"
import { cleanUrl } from "~libs/clean-url"
import { getOllamaURL, systemPromptForNonRag } from "~services/ollama"
import { useStoreMessage, type ChatHistory, type Message } from "~store"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { HumanMessage, AIMessage } from "@langchain/core/messages"
import { getHtmlOfCurrentTab } from "~libs/get-html"
import { PageAssistHtmlLoader } from "~loader/html"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { OllamaEmbeddings } from "langchain/embeddings/ollama"
import { Voy as VoyClient } from "voy-search"
import { createChatWithWebsiteChain } from "~chain/chat-with-website"
import { MemoryVectorStore } from "langchain/vectorstores/memory"

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
    setSelectedModel,
    chatMode,
    setChatMode
  } = useStoreMessage()

  const abortControllerRef = React.useRef<AbortController | null>(null)

  const [keepTrackOfEmbedding, setKeepTrackOfEmbedding] = React.useState<{
    [key: string]: MemoryVectorStore
  }>({})

  const clearChat = () => {
    stopStreamingRequest()
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
  }

  const memoryEmbedding = async (
    url: string,
    html: string,
    ollamaEmbedding: OllamaEmbeddings
  ) => {
    const loader = new PageAssistHtmlLoader({
      html,
      url
    })
    const docs = await loader.load()
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    })

    const chunks = await textSplitter.splitDocuments(docs)

    const store = new MemoryVectorStore(ollamaEmbedding)

    await store.addDocuments(chunks)

    setKeepTrackOfEmbedding({
      ...keepTrackOfEmbedding,
      [url]: store
    })

    return store
  }

  const chatWithWebsiteMode = async (message: string) => {
    const ollamaUrl = await getOllamaURL()
    const { html, url } = await getHtmlOfCurrentTab()
    const isAlreadyExistEmbedding = keepTrackOfEmbedding[url]
    let newMessage: Message[] = [
      ...messages,
      {
        isBot: false,
        name: "You",
        message,
        sources: []
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
    const ollamaEmbedding = new OllamaEmbeddings({
      model: selectedModel,
      baseUrl: cleanUrl(ollamaUrl)
    })

    const ollamaChat = new ChatOllama({
      model: selectedModel,
      baseUrl: cleanUrl(ollamaUrl)
    })

    let vectorstore: MemoryVectorStore

    if (isAlreadyExistEmbedding) {
      vectorstore = isAlreadyExistEmbedding
    } else {
      vectorstore = await memoryEmbedding(url, html, ollamaEmbedding)
    }

    const questionPrompt =
      "Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.   Chat History: {chat_history} Follow Up Input: {question} Standalone question:"

    const systemPrompt = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say you don't know. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.  {context}  Question: {question} Helpful answer in markdown:`

    const sanitizedQuestion = message.trim().replaceAll("\n", " ")

    const chain = createChatWithWebsiteChain({
      llm: ollamaChat,
      question_llm: ollamaChat,
      question_template: questionPrompt,
      response_template: systemPrompt,
      retriever: vectorstore.asRetriever()
    })

    try {
      const chunks = await chain.stream({
        question: sanitizedQuestion
      })
      let count = 0
      for await (const chunk of chunks) {
        if (count === 0) {
          setIsProcessing(true)
          newMessage[appendingIndex].message = chunk + "▋"
          setMessages(newMessage)
        } else {
          newMessage[appendingIndex].message =
            newMessage[appendingIndex].message.slice(0, -1) + chunk + "▋"
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

  const normalChatMode = async (message: string) => {
    const url = await getOllamaURL()

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
        sources: []
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
      const prompt = await systemPromptForNonRag()

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

  const onSubmit = async (message: string) => {
    if (chatMode === "normal") {
      await normalChatMode(message)
    } else {
      await chatWithWebsiteMode(message)
    }
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
    setChatMode
  }
}
