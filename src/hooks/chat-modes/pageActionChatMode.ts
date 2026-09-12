import { type ChatHistory, type Message } from "~/store/option"
import { normalChatMode } from "./normalChatMode"
import {
  cachePageActionTools,
  getPageActionSystemPrompt,
  isPageActionApprovalRequired
} from "@/services/page-action"
import { McpBootstrapError } from "@/libs/mcp/errors"
import { normalizePageActionToolCallArgs } from "@/libs/mcp/page-action-args"
import {
  getWebMcpServer,
  getWebMcpSystemPrompt,
  isWebMcpApprovalRequired
} from "@/services/webmcp"

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
  /** Also expose the WebMCP tools of the current page. */
  includeWebMcp?: boolean
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

  const { includeWebMcp = false, ...chatOptions } = options

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

  const extraMcpServers = [server]
  const systemPrompts = [extraSystemPrompt]
  let webMcpApproval = false

  if (includeWebMcp) {
    webMcpApproval = await isWebMcpApprovalRequired()
    extraMcpServers.push(await getWebMcpServer())
    systemPrompts.push(await getWebMcpSystemPrompt())
  }

  await normalChatMode(message, image, isRegenerate, messages, history, signal, {
    ...chatOptions,
    requireMcpApproval:
      pageActionApproval ||
      webMcpApproval ||
      (options.requireMcpApproval ?? false),
    extraMcpServers,
    extraSystemPrompt: systemPrompts.join("\n\n"),
    normalizeMcpToolCallArgs: normalizePageActionToolCallArgs
  })
}
