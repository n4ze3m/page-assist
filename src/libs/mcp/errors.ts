export class McpBootstrapError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = "McpBootstrapError"
  }
}

export const getMcpErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
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
