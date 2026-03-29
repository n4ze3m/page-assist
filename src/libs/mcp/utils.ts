import {
  ChatActionInfo,
  ChatMessageKind,
  McpAvailableTool,
  McpHeader,
  McpOAuthTokens,
  McpServerInput,
  McpToolExecutionMode,
  McpToolCall
} from "./types"

export const MCP_TOOL_NAME_SEPARATOR = "__"

export const isTraceMessageKind = (messageKind?: ChatMessageKind) =>
  messageKind === "assistant_tool_calls" || messageKind === "tool_result"

export const isTextMessageKind = (messageKind?: ChatMessageKind) =>
  !messageKind || messageKind === "text"

export const isConversationMessage = ({
  role,
  messageKind
}: {
  role?: string
  messageKind?: ChatMessageKind
}) => role !== "tool" && !isTraceMessageKind(messageKind)

export const parseMcpToolName = (rawName: string) => {
  const separatorIndex = rawName.indexOf(MCP_TOOL_NAME_SEPARATOR)

  if (separatorIndex === -1) {
    return {
      rawName,
      serverName: undefined,
      displayName: rawName
    }
  }

  return {
    rawName,
    serverName: rawName.slice(0, separatorIndex),
    displayName: rawName.slice(separatorIndex + MCP_TOOL_NAME_SEPARATOR.length)
  }
}

export const sanitizeHeaders = (headers?: McpHeader[]) =>
  (headers || []).filter(
    (header) =>
      header &&
      typeof header.key === "string" &&
      typeof header.value === "string" &&
      header.key.trim().length > 0 &&
      header.value.trim().length > 0
  )

export const getMcpToolExecutionMode = (
  tool?: Pick<McpAvailableTool, "enabled" | "executionMode">
): McpToolExecutionMode => {
  if (tool?.executionMode) {
    return tool.executionMode
  }

  if (tool?.enabled === false) {
    return "disabled"
  }

  return "human_in_loop"
}

export const isMcpToolEnabled = (
  tool?: Pick<McpAvailableTool, "enabled" | "executionMode">
) => getMcpToolExecutionMode(tool) !== "disabled"

export const normalizeMcpServerInput = (
  server: Partial<McpServerInput>
): McpServerInput => {
  const authType = server.authType ?? "none"

  return {
    name: server.name?.trim() ?? "",
    transport: "http",
    url: server.url?.trim() ?? "",
    enabled: server.enabled ?? true,
    authType,
    bearerToken:
      authType === "bearer" ? server.bearerToken?.trim() || undefined : undefined,
    headers: sanitizeHeaders(server.headers),
    oauthTokens: authType === "oauth" ? server.oauthTokens : undefined,
    oauthClientRegistration:
      authType === "oauth" ? server.oauthClientRegistration : undefined,
    oauthMetadata: authType === "oauth" ? server.oauthMetadata : undefined
  }
}

export const getMcpServerConfigFingerprint = (
  server: Partial<McpServerInput>
) => {
  const normalized = normalizeMcpServerInput(server)

  return JSON.stringify({
    name: normalized.name,
    transport: normalized.transport,
    url: normalized.url,
    authType: normalized.authType,
    bearerToken: normalized.bearerToken ?? "",
    headers: [...normalized.headers].sort((left, right) =>
      left.key.localeCompare(right.key)
    )
  })
}

export const buildMcpHeaders = ({
  authType,
  bearerToken,
  headers,
  oauthTokens
}: {
  authType: "none" | "bearer" | "oauth"
  bearerToken?: string
  headers?: McpHeader[]
  oauthTokens?: McpOAuthTokens
}) => {
  const defaultHeaders: Record<string, string> = {}

  if (authType === "bearer" && bearerToken?.trim()) {
    defaultHeaders.Authorization = `Bearer ${bearerToken.trim()}`
  } else if (authType === "oauth" && oauthTokens?.accessToken) {
    defaultHeaders.Authorization = `Bearer ${oauthTokens.accessToken}`
  }

  for (const header of sanitizeHeaders(headers)) {
    defaultHeaders[header.key.trim()] = header.value.trim()
  }

  return defaultHeaders
}

export const toStoredToolCalls = (toolCalls: McpToolCall[] = []): McpToolCall[] =>
  toolCalls.map((toolCall) => {
    const parsed = parseMcpToolName(toolCall.name)

    return {
      id: toolCall.id,
      name: toolCall.name,
      args: toolCall.args ?? {},
      type: "tool_call",
      serverName: toolCall.serverName || parsed.serverName,
      displayName: toolCall.displayName || parsed.displayName
    }
  })

export const summarizeToolCalls = (toolCalls: McpToolCall[] = []) => {
  if (toolCalls.length === 0) {
    return ""
  }

  return toolCalls
    .map((toolCall) => toolCall.displayName || parseMcpToolName(toolCall.name).displayName)
    .join(", ")
}

export const stringifyToolArgs = (args: unknown) => {
  try {
    return JSON.stringify(args ?? {}, null, 2)
  } catch (error) {
    return String(args ?? "")
  }
}

export const normalizeToolContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    const flattened = content
      .map((item) => {
        if (typeof item === "string") {
          return item
        }

        if (item && typeof item === "object") {
          if ("text" in item && typeof item.text === "string") {
            return item.text
          }

          if ("type" in item && typeof item.type === "string") {
            return JSON.stringify(item, null, 2)
          }
        }

        return String(item ?? "")
      })
      .filter(Boolean)

    return flattened.join("\n\n")
  }

  if (content && typeof content === "object") {
    try {
      return JSON.stringify(content, null, 2)
    } catch (error) {
      return String(content)
    }
  }

  return String(content ?? "")
}

export const createMcpActionInfo = (
  phase:
    | "connecting"
    | "loading_tools"
    | "awaiting_approval"
    | "calling_tool"
    | "waiting_result",
  details?: Omit<Extract<ChatActionInfo, { type: "mcp" }>, "type" | "phase">
): ChatActionInfo => ({
  type: "mcp",
  phase,
  ...details
})
