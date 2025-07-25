import { cleanUrl } from "~/libs/clean-url"
import {
  getOllamaURL,
  systemPromptForNonRagOption
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { generateID, getPromptById } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent
} from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import { McpManager } from "@/mcp/McpManager"
import { generateMcpToolSystemPrompt } from "@/mcp/prompt"
import { db } from "@/db/dexie/schema"

const yieldToMainThread = () => new Promise(resolve => setTimeout(resolve, 0))

export const normalChatMode = async (
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
    saveMessageOnSuccess,
    saveMessageOnError,
    setHistory,
    setIsProcessing,
    setStreaming,
    setAbortController,
    historyId,
    setHistoryId,
    uploadedFiles
  }: {
    selectedModel: string
    useOCR: boolean
    selectedSystemPrompt: string
    currentChatModelSettings: any
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
    saveMessageOnSuccess: (data: any) => Promise<string | null>
    saveMessageOnError: (data: any) => Promise<string | null>
    setHistory: (history: ChatHistory) => void
    setIsProcessing: (value: boolean) => void
    setStreaming: (value: boolean) => void
    setAbortController: (controller: AbortController | null) => void
    historyId: string | null
    setHistoryId: (id: string) => void
    uploadedFiles?: any[]
  }
) => {
  console.log("Using normalChatMode")
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
        images: image ? [image] : [],
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel,
        documents: uploadedFiles?.map(f => ({
          type: "file",
          filename: f.filename,
          fileSize: f.size,
          processed: f.processed
        })) || []
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
  let toolCallStartTime: Date | null = null 
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

    let mcpTools: any[] = []
    try {
      mcpTools = await McpManager.getAllTools()
    } catch (error) {
      console.error("[normalChatMode] Error fetching MCP tools:", error)
    }

    let combinedPrompt = prompt || selectedPrompt?.content || "You are a helpful assistant."
    if (mcpTools.length > 0) {
      const mcpPrompt = generateMcpToolSystemPrompt(mcpTools)
      combinedPrompt = `${combinedPrompt}\n\n${mcpPrompt}`
    } else {
        if (message.toLowerCase().includes("tools are available")) {
            let configs: any[] = []
            let allConfigs: any[] = []
            try {
              configs = (await db.mcpServers.toArray()).filter(server => server.enabled === true || server.enabled === 1)
              allConfigs = await db.mcpServers.toArray()
            } catch (error) {
              console.error("[normalChatMode] Error querying mcpServers:", error)
            }
            fullText = configs.length === 0
              ? `No MCP servers are enabled. All servers: ${JSON.stringify(allConfigs, null, 2)}. Please enable an MCP server in the settings or check the database configuration.`
              : `No tools are available from enabled servers: ${JSON.stringify(configs, null, 2)}. Please verify the server configuration and ensure tools are registered.`

            setMessages((prev) => prev.map((m) => m.id === generateMessageId ? { ...m, message: fullText, reasoning_time_taken: 0 } : m))
            setHistory([...history, { role: "user", content: message, image }, { role: "assistant", content: fullText }])
            await saveMessageOnSuccess({ historyId, setHistoryId, isRegenerate, selectedModel, message, image, fullText, source: [], generationInfo: null, prompt_content: promptContent, prompt_id: promptId, reasoning_time_taken: 0 })
            setIsProcessing(false)
            setStreaming(false)
            setAbortController(null)
            return
        }
    }

    let generationInfo: any | undefined = undefined

    const streamOptions = {
      signal,
      tools: mcpTools,
      onToolStart: async (tool: { name: string, arguments: any }) => {
        console.log(`[normalChatMode] UI Callback: Starting tool ${tool.name}`)
        toolCallStartTime = new Date()
        const toolArgs = JSON.stringify(tool.arguments, null, 2)
		const [serverName, actualToolName] = tool.name.split('::') // parse prefixed tool name for display
        const startMessage = `\n<tool_run>**Server:** ${serverName}\n\n**Tool:** ${actualToolName}\n\n**Arguments:**\n\`\`\`json\n${toolArgs}\n\`\`\``
        fullText += startMessage
        contentToSave += startMessage
        setMessages((prev) => prev.map((m) => m.id === generateMessageId ? { ...m, message: fullText.replace("▋", "") } : m))
        await yieldToMainThread()
      },
      onToolEnd: async (tool: { name: string }, output: string) => {
        console.log(`[normalChatMode] UI Callback: Tool ${tool.name} finished.`)
        const duration = toolCallStartTime ? new Date().getTime() - toolCallStartTime.getTime() : 0
        let formattedOutput = output
        try { formattedOutput = JSON.stringify(JSON.parse(output), null, 2) } catch {}
        const endMessage = `\n\n**Result:**\n\`\`\`json\n${formattedOutput}\n\`\`\`\n</tool_run duration="${duration}">`
        fullText += endMessage
        contentToSave += endMessage
        setMessages((prev) => prev.map((m) => m.id === generateMessageId ? { ...m, message: fullText.replace("▋", "") } : m))
        await yieldToMainThread()
      },
      onToolError: async (tool: { name: string }, error: any) => {
        console.error(`[normalChatMode] UI Callback: Error in tool ${tool.name}:`, error)
        const duration = toolCallStartTime ? new Date().getTime() - toolCallStartTime.getTime() : 0
        const errorMessage = `\n\n**Error:**\n\`\`\`\n${error.message}\n\`\`\`\n</tool_run duration="${duration}">`
        fullText += errorMessage
        contentToSave += errorMessage
        setMessages((prev) => prev.map((m) => m.id === generateMessageId ? { ...m, message: fullText.replace("▋", "") } : m))
        await yieldToMainThread()
      },
      callbacks: [{ handleLLMEnd: (output: any) => { generationInfo = output?.generations?.[0][0]?.generationInfo || null }}]
              }

    const chunks = await ollama.stream([...applicationChatHistory, humanMessage], streamOptions)

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
              message: fullText + (chunk.done ? "" : "▋"),
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
  } catch (e) {

    console.error("[normalChatMode] Error:", e)

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
      throw e // Re-throw to be handled by the calling function
    }
    setIsProcessing(false)
    setStreaming(false)
  } finally {
    setAbortController(null)
  }
}
