export type ChatMessageKind = "text" | "assistant_tool_calls" | "tool_result"

export type McpHeader = {
  key: string
  value: string
}

export type McpAvailableTool = {
  name: string
  description?: string
  inputSchema?: unknown
}

export type McpServer = {
  id: string
  name: string
  transport: "http"
  url: string
  enabled: boolean
  authType: "none" | "bearer"
  bearerToken?: string
  headers?: McpHeader[]
  cachedTools?: McpAvailableTool[]
  toolsLastSyncedAt?: number
  toolsSyncError?: string
  createdAt: number
  updatedAt: number
}

export type McpServerInput = Pick<
  McpServer,
  "name" | "transport" | "url" | "enabled" | "authType" | "bearerToken" | "headers"
>

export type McpToolCall = {
  id: string
  name: string
  args?: unknown
  type?: "tool_call"
  serverName?: string
  displayName?: string
}

export type ChatActionInfo =
  | string
  | {
      type: "mcp"
      phase: "connecting" | "loading_tools" | "calling_tool" | "waiting_result"
      serverName?: string
      toolName?: string
      toolCount?: number
    }
