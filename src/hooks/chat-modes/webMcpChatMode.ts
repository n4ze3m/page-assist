import { type ChatHistory, type Message } from "~/store/option"
import { normalChatMode } from "./normalChatMode"
import {
  getWebMcpServer,
  getWebMcpSystemPrompt,
  isWebMcpApprovalRequired
} from "@/services/webmcp"

type WebMcpChatModeOptions = {
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
  images?: string[]
  setActionInfo?: (value: any) => void
  temporaryChat?: boolean
  requireMcpApproval?: boolean
  messageSource?: "copilot" | "web-ui"
}

export const webMcpChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  options: WebMcpChatModeOptions
) => {
  console.log("Using webMcpChatMode")

  const approvalRequired = await isWebMcpApprovalRequired()
  const extraSystemPrompt = await getWebMcpSystemPrompt()
  const webMcpServer = await getWebMcpServer()

  await normalChatMode(message, image, isRegenerate, messages, history, signal, {
    ...options,
    requireMcpApproval:
      approvalRequired || (options.requireMcpApproval ?? false),
    extraMcpServers: [webMcpServer],
    extraSystemPrompt
  })
}
