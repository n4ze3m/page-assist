import React from "react"
import { type Message } from "@/store/option"
import { generateID } from "@/db/dexie/helpers"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent,
  removeReasoning
} from "@/libs/reasoning"
import { STREAM_REVEAL } from "../streamingConfig"

export const CURSOR = "…"

export interface StreamConfig {
  cursor?: string
  reveal: {
    charsPerFlush: number
    flushIntervalMs: number
  }
}

interface StreamChatResponseParams {
  ollama: any
  applicationChatHistory: any[]
  humanMessage?: any
  userMessage?: string
  selectedModel: string
  messages: Message[]
  isRegenerate: boolean
  isContinue?: boolean
  botMessageId?: string
  initialFullText?: string
  signal: AbortSignal
  config: StreamConfig
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  onChunk?: (chunk: any, fullText: string) => void
  onComplete: (
    fullText: string,
    generationInfo?: any,
    timetaken?: number
  ) => Promise<void>
  onError?: (error: any, fullText: string) => Promise<void>
  image?: string
  sources?: any[]
  documents?: any[]
  messageType?: string
}

const defaultConfig: StreamConfig = {
  cursor: CURSOR,
  reveal: STREAM_REVEAL
}

export const streamChatResponse = async (params: StreamChatResponseParams) => {
  const {
    ollama,
    applicationChatHistory,
    humanMessage,
    userMessage,
    selectedModel,
    messages,
    isRegenerate,
    isContinue = false,
    botMessageId,
    initialFullText = "",
    signal,
    config = defaultConfig,
    setMessages,
    onChunk,
    onComplete,
    onError,
    image = "",
    sources = [],
    documents = [],
    messageType = ""
  } = params

  const cursor = config.cursor ?? ""
  const { reveal } = config
  const { charsPerFlush, flushIntervalMs } = reveal
  const maxCharsPerFlush = Math.max(charsPerFlush * 10000, charsPerFlush)

  const resolveUserMessage = () => {
    if (typeof userMessage === "string") {
      return userMessage
    }
    const content = humanMessage?.content
    if (typeof content === "string") {
      return content
    }
    if (Array.isArray(content)) {
      const textEntry = content.find((item) => typeof item?.text === "string")
      if (textEntry?.text) {
        return textEntry.text
      }
    }
    return ""
  }

  // Setup bot message or get existing
  let generateMessageId: string
  const modelInfo = await getModelNicknameByID(selectedModel)
  let newMessage: Message[] = [...messages]

  if (isContinue) {
    if (!botMessageId) {
      throw new Error("botMessageId required for continue mode")
    }
    generateMessageId = botMessageId
    const existingBot = newMessage.find((m) => m.id === generateMessageId)
    if (!existingBot) {
      throw new Error("Existing bot message not found for continue")
    }
    // Append cursor to existing message
    newMessage = newMessage.map((m) =>
      m.id === generateMessageId
        ? { ...m, message: initialFullText + cursor }
        : m
    )
  } else {
    generateMessageId = botMessageId || generateID()
    if (!isRegenerate && humanMessage) {
      const resolvedUserMessage = resolveUserMessage()
      newMessage = [
        ...newMessage,
        {
          isBot: false,
          name: "You",
          message: resolvedUserMessage,
          sources: [],
          images: image ? [image] : [],
          documents
        },
        {
          isBot: true,
          name: selectedModel,
          message: cursor,
          sources: [],
          id: generateMessageId,
          modelImage: modelInfo?.model_avatar,
          modelName: modelInfo?.model_name || selectedModel,
          messageType
        }
      ]
    } else {
      newMessage = [
        ...newMessage,
        {
          isBot: true,
          name: selectedModel,
          message: cursor,
          sources: [],
          id: generateMessageId,
          modelImage: modelInfo?.model_avatar,
          modelName: modelInfo?.model_name || selectedModel,
          messageType
        }
      ]
    }
  }
  setMessages(newMessage)

  let fullText = isContinue ? initialFullText : ""
  let contentToSave = fullText

  // Buffered soft-reveal state
  let pendingBuffer = ""
  let visibleText = fullText
  let flushTimer: ReturnType<typeof setInterval> | null = null
  const computeFlushSize = () => {
    if (pendingBuffer.length <= charsPerFlush * 2) {
      return charsPerFlush
    }
    const scaled = Math.ceil(pendingBuffer.length * 0.05)
    return Math.min(Math.max(scaled, charsPerFlush), maxCharsPerFlush)
  }
  const startFlush = () => {
    if (flushTimer == null) {
      flushTimer = setInterval(() => {
        if (pendingBuffer.length > 0) {
          const flushSize = computeFlushSize()
          const take = pendingBuffer.slice(0, flushSize)
          pendingBuffer = pendingBuffer.slice(flushSize)
          visibleText += take
          updateVisibleMessage(visibleText + cursor)
        } else {
          cleanupFlush()
        }
      }, flushIntervalMs)
    }
  }

  const appendBuffered = (text: string) => {
    if (!text) return
    pendingBuffer += text
    startFlush()
  }

  const updateVisibleMessage = (nextMessage: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === generateMessageId
          ? {
              ...m,
              message: nextMessage,
              reasoning_time_taken: timetaken,
              uiStreaming: { lastFlushedAt: Date.now() }
            }
          : m
      )
    )
  }

  const flushAll = () => {
    if (flushTimer != null) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    if (pendingBuffer.length > 0) {
      visibleText += pendingBuffer
      pendingBuffer = ""
    }
    if (visibleText !== fullText) {
      visibleText = fullText
    }
    updateVisibleMessage(visibleText + cursor)
  }
  const cleanupFlush = () => {
    if (flushTimer != null) {
      clearInterval(flushTimer)
      flushTimer = null
    }
  }

  let generationInfo: any | undefined = undefined
  let reasoningStartTime: Date | null = null
  let reasoningEndTime: Date | null = null
  let timetaken = 0
  let apiReasoning = false

  try {
    const callbacks = [
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

    const streamInput = humanMessage
      ? [...applicationChatHistory, humanMessage]
      : applicationChatHistory

    const chunks = await ollama.stream(streamInput, {
      signal,
      callbacks
    })

    let count = 0
    for await (const chunk of chunks) {
      const previousFullText = fullText

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
        timetaken = reasoningEndTime.getTime() - reasoningStartTime.getTime()
      }

      if (onChunk) {
        onChunk(chunk, fullText)
      }

      if (fullText.startsWith(previousFullText)) {
        const delta = fullText.slice(previousFullText.length)
        appendBuffered(delta)
      } else {
        pendingBuffer = ""
        visibleText = fullText
        updateVisibleMessage(visibleText + cursor)
      }

      if (count === 0) {
        // Defer processing state to caller
      }
      count++
    }

    flushAll()
    setMessages((prev) => {
      return prev.map((message) => {
        if (message.id === generateMessageId) {
          return {
            ...message,
            message: fullText,
            sources,
            generationInfo,
            reasoning_time_taken: timetaken,
            uiStreaming: undefined
          }
        }
        return message
      })
    })

    await onComplete(fullText, generationInfo, timetaken)
  } catch (e) {
    cleanupFlush()
    if (onError) {
      await onError(e, fullText)
    }
    throw e
  } finally {
    cleanupFlush()
  }
}
