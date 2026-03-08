export class McpBootstrapError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = "McpBootstrapError"
  }
}

const LEGACY_MCP_ERROR_PATTERNS = [
  "Missing sessionId parameter",
  "No transport found for sessionId",
  "Error POSTing to endpoint"
]

const getFriendlyMcpErrorMessage = (message: string) => {
  if (
    LEGACY_MCP_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
  ) {
    return "Legacy MCP SSE endpoints are not supported. Use a Streamable HTTP MCP endpoint instead."
  }

  return message
}

export const getMcpErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return getFriendlyMcpErrorMessage(error.message)
  }

  if (typeof error === "string") {
    return getFriendlyMcpErrorMessage(error)
  }

  return "Unknown MCP error"
}

export const isAbortLikeError = (error: unknown) => {
  const message = getMcpErrorMessage(error)

  return (
    error instanceof DOMException ||
    message === "AbortError" ||
    message.includes("AbortError")
  )
}
