import { type ChatHistory, type Message } from "~/store/option"
import { normalChatMode } from "./normalChatMode"
import {
  cachePageActionTools,
  getPageActionSystemPrompt,
  isPageActionApprovalRequired
} from "@/services/page-action"
import { McpBootstrapError } from "@/libs/mcp/errors"
import { normalizePageActionToolCallArgs } from "@/libs/mcp/page-action-args"

type PageActionChatModeOptions = {
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

export const pageActionChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  options: PageActionChatModeOptions
) => {
  console.log("Using pageActionChatMode")

  let server
  try {
    server = await cachePageActionTools()
  } catch (error) {
    throw new McpBootstrapError(
      "Page Action is not available. Make sure the Page Action extension is installed and enabled.",
      error
    )
  }

  const pageActionApproval = await isPageActionApprovalRequired()
  const extraSystemPrompt = await getPageActionSystemPrompt()

  await normalChatMode(message, image, isRegenerate, messages, history, signal, {
    ...options,
    requireMcpApproval: pageActionApproval || (options.requireMcpApproval ?? false),
    extraMcpServers: [server],
    extraSystemPrompt,
    normalizeMcpToolCallArgs: normalizePageActionToolCallArgs
  })
}
