export type ChatMessageKind = "text" | "assistant_tool_calls" | "tool_result"

export type McpHeader = {
  key: string
  value: string
}

export type McpAvailableTool = {
  name: string
  description?: string
  inputSchema?: unknown
  enabled?: boolean
}

export type McpOAuthTokens = {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresAt?: number
  scope?: string
}

export type McpOAuthClientRegistration = {
  clientId: string
  clientSecret?: string
  registrationAccessToken?: string
  redirectUris?: string[]
}

export type McpOAuthMetadata = {
  authorizationEndpoint: string
  tokenEndpoint: string
  registrationEndpoint?: string
  issuer?: string
  resourceMetadataUrl?: string
  scopesSupported?: string[]
}

export type McpServer = {
  id: string
  name: string
  transport: "http"
  url: string
  enabled: boolean
  authType: "none" | "bearer" | "oauth"
  bearerToken?: string
  headers?: McpHeader[]
  cachedTools?: McpAvailableTool[]
  toolsLastSyncedAt?: number
  toolsSyncError?: string
  oauthTokens?: McpOAuthTokens
  oauthClientRegistration?: McpOAuthClientRegistration
  oauthMetadata?: McpOAuthMetadata
  createdAt: number
  updatedAt: number
}

export type McpServerInput = Pick<
  McpServer,
  | "name"
  | "transport"
  | "url"
  | "enabled"
  | "authType"
  | "bearerToken"
  | "headers"
  | "oauthTokens"
  | "oauthClientRegistration"
  | "oauthMetadata"
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
