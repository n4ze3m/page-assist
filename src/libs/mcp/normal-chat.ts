import { cleanUrl } from "@/libs/clean-url"
import {
  normalizeToolContent,
  parseMcpToolName,
  toStoredToolCalls
} from "@/libs/mcp/utils"
import { pageAssistModel } from "@/models"
import { ChatDocuments } from "@/models/ChatTypes"
import { getOllamaURL, systemPromptForNonRagOption } from "@/services/ollama"
import { generateTitle } from "@/services/title"
import { type ChatHistory, type Message } from "@/store/option"
import { generateHistory } from "@/utils/generate-history"
import { humanMessageFormatter } from "@/utils/human-message"
import { systemPromptFormatter } from "@/utils/system-message"
import { getMemoriesAsContext } from "@/db/dexie/memory"
import { useStoreMessageOption } from "@/store/option"
import { AIMessage, ToolMessage } from "@langchain/core/messages"
import { concat } from "@langchain/core/utils/stream"
import { getConfiguredMcpServers, createMcpClient } from "./client"
import {
  McpBootstrapError,
  getMcpErrorMessage,
  isAbortLikeError
} from "./errors"
import {
  generateID,
  getPromptById,
  saveHistory,
  saveMessage,
  updateChatHistoryCreatedAt,
  updateHistory,
  updateLastUsedModel,
  updateLastUsedPrompt
} from "@/db/dexie/helpers"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { updatePageTitle } from "@/utils/update-page-title"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent
} from "@/libs/reasoning"
import { createMemoryTool, isMemoryEnabled, isMemoryToolEnabled } from "./tools/memory-tool"

type SetMessages = (messages: Message[] | ((prev: Message[]) => Message[])) => void
type SetHistory = (history: ChatHistory) => void

type RunMcpNormalChatParams = {
  selectedModel: string
  useOCR: boolean
  selectedSystemPrompt: string
  currentChatModelSettings: any
  setMessages: SetMessages
  setHistory: SetHistory
  setIsProcessing: (value: boolean) => void
  setStreaming: (value: boolean) => void
  setActionInfo: (value: any) => void
  historyId: string | null
  setHistoryId: (id: string) => void
  uploadedFiles?: any[]
  images?: string[]
  temporaryChat?: boolean
  requireMcpApproval?: boolean
  messageSource?: "copilot" | "web-ui"
}

const createAssistantMessage = ({
  id,
  selectedModel,
  modelName,
  modelImage
}: {
  id: string
  selectedModel: string
  modelName?: string
  modelImage?: string
}): Message => ({
  isBot: true,
  name: selectedModel,
  message: "▋",
  sources: [],
  id,
  modelImage,
  modelName
})

const createUserDocuments = (uploadedFiles?: any[]): ChatDocuments =>
  uploadedFiles?.map((file) => ({
    type: "file",
    filename: file.filename,
    fileSize: file.size,
    processed: file.processed
  })) || []

const STREAM_THROTTLE_MS = 50

const createAbortError = () => {
  const error = new Error("The operation was aborted.")
  error.name = "AbortError"
  return error
}

type McpApprovalDecision = {
  approved: boolean
  reason?: string
}

const waitForMcpToolApproval = ({
  signal,
  toolCallId,
  toolName,
  serverName,
  args
}: {
  signal: AbortSignal
  toolCallId: string
  toolName: string
  serverName?: string
  args?: unknown
}) =>
  new Promise<McpApprovalDecision>((resolve, reject) => {
    let settled = false

    const clearPendingApproval = () => {
      const currentApproval = useStoreMessageOption.getState().pendingMcpApproval
      if (currentApproval?.toolCallId === toolCallId) {
        useStoreMessageOption.getState().setPendingMcpApproval(null)
      }
    }

    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort)
      clearPendingApproval()
    }

    const settle = (
      result:
        | {
            approved: boolean
            reason?: string
          }
        | "abort"
    ) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()

      if (result === "abort") {
        reject(createAbortError())
        return
      }

      resolve(result)
    }

    const handleAbort = () => settle("abort")

    if (signal.aborted) {
      settle("abort")
      return
    }

    useStoreMessageOption.getState().setPendingMcpApproval({
      toolCallId,
      toolName,
      serverName,
      args,
      approve: () => settle({ approved: true }),
      reject: (reason?: string) =>
        settle({
          approved: false,
          reason
        })
    })

    signal.addEventListener("abort", handleAbort, { once: true })
  })

const streamModelResponse = async ({
  runnable,
  messages,
  signal,
  onToken
}: {
  runnable: any
  messages: any[]
  signal: AbortSignal
  onToken: (payload: { text: string; reasoningTimeTaken: number }) => void
}) => {
  let generationInfo: any | undefined = undefined
  let fullText = ""
  let timetaken = 0
  let count = 0
  let reasoningStartTime: Date | null = null
  let reasoningEndTime: Date | null = null
  let apiReasoning = false
  let finalChunk: any
  let lastFlushTime = 0
  let pendingFlush = false

  const chunks = await runnable.stream(messages, {
    signal,
    callbacks: [
      {
        handleLLMEnd(output: any) {
          try {
            generationInfo = output?.generations?.[0][0]?.generationInfo
          } catch (error) {
            console.error("handleLLMEnd error", error)
          }
        }
      }
    ]
  })

  for await (const chunk of chunks) {
    finalChunk = finalChunk ? concat(finalChunk, chunk) : chunk

    if (chunk?.additional_kwargs?.reasoning_content) {
      const reasoningContent = mergeReasoningContent(
        fullText,
        chunk?.additional_kwargs?.reasoning_content || ""
      )
      fullText = reasoningContent
      apiReasoning = true
    }

    if (apiReasoning && chunk?.content) {
      fullText += "</think>"
      apiReasoning = false
    }

    fullText += chunk?.content || ""

    if (isReasoningStarted(fullText) && !reasoningStartTime) {
      reasoningStartTime = new Date()
    }

    if (reasoningStartTime && !reasoningEndTime && isReasoningEnded(fullText)) {
      reasoningEndTime = new Date()
      timetaken = reasoningEndTime.getTime() - reasoningStartTime.getTime()
    }

    const now = Date.now()
    if (count === 0 || now - lastFlushTime >= STREAM_THROTTLE_MS) {
      onToken({
        text: fullText,
        reasoningTimeTaken: timetaken
      })
      lastFlushTime = now
      pendingFlush = false
    } else {
      pendingFlush = true
    }
    count++
  }

  if (apiReasoning) {
    fullText += "</think>"
    apiReasoning = false
  }

  if (pendingFlush) {
    onToken({
      text: fullText,
      reasoningTimeTaken: timetaken
    })
  }

  if (count === 0) {
    throw new Error("The model did not return any response.")
  }

  const aiMessage = new AIMessage({
    content: finalChunk?.content ?? fullText,
    additional_kwargs: finalChunk?.additional_kwargs,
    tool_calls: finalChunk?.tool_calls,
    response_metadata: finalChunk?.response_metadata,
    usage_metadata: finalChunk?.usage_metadata
  })

  return {
    aiMessage,
    generationInfo,
    fullText,
    reasoningTimeTaken: timetaken
  }
}

export const runMcpNormalChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  {
    selectedModel,
    useOCR,
    selectedSystemPrompt,
    currentChatModelSettings,
    setMessages,
    setHistory,
    setIsProcessing,
    setStreaming,
    setActionInfo,
    historyId,
    setHistoryId,
    uploadedFiles,
    images: inputImages,
    temporaryChat = false,
    requireMcpApproval = false,
    messageSource = "web-ui"
  }: RunMcpNormalChatParams
) => {
  const configuredServers = await getConfiguredMcpServers()
  const memoryEnabled = await isMemoryEnabled()
  const memoryToolEnabled = await isMemoryToolEnabled()

  if (configuredServers.length === 0 && !memoryEnabled) {
    return false
  }

  const url = await getOllamaURL()
  const ollama = await pageAssistModel({
    model: selectedModel,
    baseUrl: cleanUrl(url)
  })

  if (
    typeof ollama?.bindTools !== "function" ||
    ollama?._llmType?.() === "chrome-ai"
  ) {
    if (configuredServers.length > 0) {
      throw new McpBootstrapError(
        "The selected model does not support MCP tools. Choose an Ollama or OpenAI-compatible tool-calling model."
      )
    }
    return false
  }

  const prompt = await systemPromptForNonRagOption()
  const selectedPrompt = await getPromptById(selectedSystemPrompt)
  let promptId: string | undefined = selectedSystemPrompt
  let promptContent: string | undefined = undefined

  const processedImages = (inputImages || []).map((currentImage) => {
    if (currentImage.length > 0 && !currentImage.startsWith("data:image")) {
      return `data:image/jpeg;base64,${currentImage.split(",")[1]}`
    }

    return currentImage
  })

  if (image.length > 0 && !image.startsWith("data:image")) {
    image = `data:image/jpeg;base64,${image.split(",")[1]}`
  }

  const userImages =
    processedImages.length > 0 ? processedImages : image ? [image] : []

  const modelInfo = await getModelNicknameByID(selectedModel)
  const userEntry = {
    role: "user" as const,
    content: message,
    image: userImages[0],
    images: userImages
  }
  const userDocuments = createUserDocuments(uploadedFiles)

  let uiMessages = isRegenerate
    ? [...messages]
    : [
      ...messages,
      {
        isBot: false,
        name: "You",
        message,
        sources: [],
        images: userImages,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel,
        documents: userDocuments
      }
    ]
  let uiHistory = [...history]
  let historyWithUser = [...history, userEntry]
  let nextTimeOffset = 0
  let activeHistoryId = historyId
  let currentAssistantId = generateID()
  let finalAssistantText = ""

  const syncMessages = (nextMessages: Message[]) => {
    uiMessages = nextMessages
    setMessages(nextMessages)
  }

  const syncHistory = (nextHistory: ChatHistory) => {
    uiHistory = nextHistory
    setHistory(nextHistory)
  }

  const appendAssistantPlaceholder = () => {
    currentAssistantId = generateID()
    syncMessages([
      ...uiMessages,
      createAssistantMessage({
        id: currentAssistantId,
        selectedModel,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      })
    ])
  }

  const updateAssistantRow = (updater: (message: Message) => Message) => {
    syncMessages(
      uiMessages.map((currentMessage) =>
        currentMessage.id === currentAssistantId
          ? updater(currentMessage)
          : currentMessage
      )
    )
  }

  const contentArray: any[] = [
    {
      text: message,
      type: "text"
    }
  ]

  userImages.forEach((currentImage) => {
    contentArray.push({
      image_url: currentImage,
      type: "image_url"
    })
  })

  let humanMessage = await humanMessageFormatter({
    content: contentArray,
    model: selectedModel,
    useOCR
  })

  const applicationChatHistory = generateHistory(history, selectedModel)
  let isMemoryContextAdded = false
  let memoryContext = ""
  if (memoryEnabled) {
    const memoryContextRes = await getMemoriesAsContext()
    if (memoryContextRes) {
      memoryContext = `\n\n\n${memoryContextRes}`
    }
  }
  if (prompt && !selectedPrompt) {
    applicationChatHistory.unshift(
      await systemPromptFormatter({
        content: prompt + memoryContext
      })
    )
    isMemoryContextAdded = true
  }

  const isTempSystemprompt =
    currentChatModelSettings.systemPrompt &&
    currentChatModelSettings.systemPrompt?.trim().length > 0

  if (!isTempSystemprompt && selectedPrompt) {
    applicationChatHistory.unshift(
      await systemPromptFormatter({
        content: selectedPrompt.content + memoryContext
      })
    )
    promptContent = selectedPrompt.content
    isMemoryContextAdded = true
  }

  if (isTempSystemprompt) {
    applicationChatHistory.unshift(
      await systemPromptFormatter({
        content: currentChatModelSettings.systemPrompt + memoryContext
      })
    )
    promptContent = currentChatModelSettings.systemPrompt
    isMemoryContextAdded = true
  }

  if (memoryEnabled && !isMemoryContextAdded) {
    const memoryContext = await getMemoriesAsContext()
    if (memoryContext) {
      applicationChatHistory.push(
        await systemPromptFormatter({
          content: memoryContext
        })
      )
  }
  }

  const hasMcpServers = configuredServers.length > 0
  const client = hasMcpServers ? createMcpClient(configuredServers) : null
  let boundModel: any

  try {
    const tools = hasMcpServers ? await client!.getTools() : []

    if (memoryEnabled && memoryToolEnabled) {
      tools.push(createMemoryTool())
    }

    if (tools.length === 0) {
      return false
    }

    try {
      boundModel = ollama.bindTools(tools)
    } catch (error) {
      throw new McpBootstrapError(
        "The selected model could not bind MCP tools.",
        error
      )
    }

    if (!temporaryChat) {
      if (!activeHistoryId) {
        const provisionalTitle = message?.trim() || "Untitled Chat"
        const createdHistory = await saveHistory(
          provisionalTitle,
          false,
          messageSource
        )
        activeHistoryId = createdHistory.id
        setHistoryId(createdHistory.id)
        updatePageTitle(provisionalTitle)
      }

      if (!isRegenerate && activeHistoryId) {
        await saveMessage({
          history_id: activeHistoryId,
          name: selectedModel,
          role: "user",
          content: message,
          images: userImages,
          time: ++nextTimeOffset,
          message_type: "normal",
          documents: userDocuments
        })
      }

      if (activeHistoryId) {
        await updateLastUsedModel(activeHistoryId, selectedModel)
        if (promptId || promptContent) {
          await updateLastUsedPrompt(activeHistoryId, {
            prompt_content: promptContent,
            prompt_id: promptId
          })
        }
      }
    }

    appendAssistantPlaceholder()

    let lcConversation: any[] = [...applicationChatHistory, humanMessage]

    while (true) {
      setIsProcessing(true)
      const {
        aiMessage,
        fullText,
        generationInfo,
        reasoningTimeTaken
      } = await streamModelResponse({
        runnable: boundModel,
        messages: lcConversation,
        signal,
        onToken: ({ text, reasoningTimeTaken: currentReasoningTimeTaken }) => {
          if (!text.trim()) {
            return
          }

          updateAssistantRow((currentMessage) => ({
            ...currentMessage,
            message: `${text}▋`,
            reasoning_time_taken: currentReasoningTimeTaken
          }))
        }
      })

      finalAssistantText = fullText
      const storedToolCalls = toStoredToolCalls((aiMessage as any).tool_calls || [])

      if (storedToolCalls.length === 0) {
        const assistantHistoryEntry = {
          role: "assistant" as const,
          content: fullText
        }

        updateAssistantRow((currentMessage) => ({
          ...currentMessage,
          message: fullText,
          generationInfo,
          reasoning_time_taken: reasoningTimeTaken
        }))

        syncHistory([...historyWithUser, assistantHistoryEntry])

        if (!temporaryChat && activeHistoryId) {
          await saveMessage({
            history_id: activeHistoryId,
            name: selectedModel,
            role: "assistant",
            content: fullText,
            images: [],
            source: [],
            time: ++nextTimeOffset,
            message_type: "normal",
            generationInfo,
            reasoning_time_taken: reasoningTimeTaken
          })

          await updateChatHistoryCreatedAt(activeHistoryId)

          if (!historyId) {
            const generatedTitle = await generateTitle(
              selectedModel,
              [...historyWithUser, assistantHistoryEntry],
              message
            )
            await updateHistory(activeHistoryId, generatedTitle)
            updatePageTitle(generatedTitle)
          }
        }

        break
      }

      const assistantToolCallEntry = {
        role: "assistant" as const,
        content: fullText,
        messageKind: "assistant_tool_calls" as const,
        toolCalls: storedToolCalls
      }

      updateAssistantRow((currentMessage) => ({
        ...currentMessage,
        message: fullText,
        messageKind: "assistant_tool_calls",
        toolCalls: storedToolCalls,
        reasoning_time_taken: reasoningTimeTaken,
        generationInfo: undefined,
        sources: []
      }))

      historyWithUser = [...historyWithUser, assistantToolCallEntry]
      syncHistory(historyWithUser)

      const pendingDbWrites: Promise<any>[] = []

      if (!temporaryChat && activeHistoryId) {
        pendingDbWrites.push(
          saveMessage({
            history_id: activeHistoryId,
            name: selectedModel,
            role: "assistant",
            content: fullText,
            images: [],
            source: [],
            time: ++nextTimeOffset,
            message_type: "normal",
            messageKind: "assistant_tool_calls",
            toolCalls: storedToolCalls,
            reasoning_time_taken: reasoningTimeTaken
          })
        )
      }

      const toolMessages: ToolMessage[] = []

      for (const toolCall of storedToolCalls) {
        const parsedTool = parseMcpToolName(toolCall.name)

        try {
          const lowerCallName = toolCall.name.toLowerCase()
          const tool = tools.find((currentTool) => currentTool.name === toolCall.name)
            ?? tools.find((currentTool) => currentTool.name.toLowerCase() === lowerCallName)
            ?? tools.find((currentTool) => parseMcpToolName(currentTool.name).displayName === toolCall.name)
            ?? tools.find((currentTool) => parseMcpToolName(currentTool.name).displayName.toLowerCase() === lowerCallName)
          if (!tool) {
            throw new Error(`Tool "${toolCall.name}" is no longer available.`)
          }

          if (requireMcpApproval) {
            const shouldRequireApproval =
              (tool as any)?.metadata?.executionMode !== "allow"

            if (shouldRequireApproval) {
              const approval = await waitForMcpToolApproval({
                signal,
                toolCallId: toolCall.id,
                toolName: parsedTool.displayName,
                serverName: toolCall.serverName || parsedTool.serverName,
                args: toolCall.args
              })

              if (!approval.approved) {
                const rejectionReason = approval.reason?.trim()
                throw new Error(
                  rejectionReason?.length
                    ? `Tool execution denied by user: ${rejectionReason}`
                    : `Tool execution denied by user for "${parsedTool.displayName}".`
                )
              }
            }
          }

          const result = await tool.invoke(toolCall, { signal })
          const toolMessage =
            result instanceof ToolMessage
              ? result
              : new ToolMessage({
                content: normalizeToolContent(result),
                tool_call_id: toolCall.id,
                status: "success"
              })

          toolMessages.push(toolMessage)

          const toolResultEntry = {
            role: "tool" as const,
            content: normalizeToolContent(toolMessage.content),
            messageKind: "tool_result" as const,
            toolCallId: toolMessage.tool_call_id || toolCall.id,
            toolName: parsedTool.displayName,
            toolServerName: toolCall.serverName || parsedTool.serverName,
            toolError: toolMessage.status === "error"
          }

          historyWithUser = [...historyWithUser, toolResultEntry]
          syncHistory(historyWithUser)
          syncMessages([
            ...uiMessages,
            {
              isBot: true,
              name: selectedModel,
              message: toolResultEntry.content,
              sources: [],
              messageKind: "tool_result",
              toolCallId: toolResultEntry.toolCallId,
              toolName: toolResultEntry.toolName,
              toolServerName: toolResultEntry.toolServerName,
              toolError: toolResultEntry.toolError,
              modelImage: modelInfo?.model_avatar,
              modelName: modelInfo?.model_name || selectedModel
            }
          ])

          if (!temporaryChat && activeHistoryId) {
            pendingDbWrites.push(
              saveMessage({
                history_id: activeHistoryId,
                name: selectedModel,
                role: "tool",
                content: toolResultEntry.content,
                images: [],
                time: ++nextTimeOffset,
                message_type: "normal",
                messageKind: "tool_result",
                toolCallId: toolResultEntry.toolCallId,
                toolName: toolResultEntry.toolName,
                toolServerName: toolResultEntry.toolServerName,
                toolError: toolResultEntry.toolError
              })
            )
          }
        } catch (error) {
          const toolErrorMessage = getMcpErrorMessage(error)
          const toolResultEntry = {
            role: "tool" as const,
            content: toolErrorMessage,
            messageKind: "tool_result" as const,
            toolCallId: toolCall.id,
            toolName: parsedTool.displayName,
            toolServerName: toolCall.serverName || parsedTool.serverName,
            toolError: true
          }

          toolMessages.push(
            new ToolMessage({
              content: toolErrorMessage,
              tool_call_id: toolCall.id,
              status: "error"
            })
          )

          historyWithUser = [...historyWithUser, toolResultEntry]
          syncHistory(historyWithUser)
          syncMessages([
            ...uiMessages,
            {
              isBot: true,
              name: selectedModel,
              message: toolErrorMessage,
              sources: [],
              messageKind: "tool_result",
              toolCallId: toolCall.id,
              toolName: parsedTool.displayName,
              toolServerName: toolCall.serverName || parsedTool.serverName,
              toolError: true,
              modelImage: modelInfo?.model_avatar,
              modelName: modelInfo?.model_name || selectedModel
            }
          ])

          if (!temporaryChat && activeHistoryId) {
            pendingDbWrites.push(
              saveMessage({
                history_id: activeHistoryId,
                name: selectedModel,
                role: "tool",
                content: toolErrorMessage,
                images: [],
                time: ++nextTimeOffset,
                message_type: "normal",
                messageKind: "tool_result",
                toolCallId: toolCall.id,
                toolName: parsedTool.displayName,
                toolServerName: toolCall.serverName || parsedTool.serverName,
                toolError: true
              })
            )
          }
        } finally {
          setActionInfo(null)
        }
      }

      await Promise.all(pendingDbWrites)

      lcConversation = [...lcConversation, aiMessage, ...toolMessages]
      appendAssistantPlaceholder()
    }

    setIsProcessing(false)
    setStreaming(false)
    return true
  } catch (error) {
    if (isAbortLikeError(error)) {
      if (finalAssistantText.trim()) {
        updateAssistantRow((currentMessage) => ({
          ...currentMessage,
          message: finalAssistantText
        }))
      } else {
        syncMessages(
          uiMessages.filter((currentMessage) => currentMessage.id !== currentAssistantId)
        )
      }

      setIsProcessing(false)
      setStreaming(false)
      return true
    }

    if (error instanceof McpBootstrapError) {
      throw error
    }

    throw error
  } finally {
    setActionInfo(null)
    await client?.close()
  }
}
