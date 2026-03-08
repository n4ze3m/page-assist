import { parseMcpToolName } from "@/libs/mcp/utils"
import type { McpToolCall } from "@/libs/mcp/types"
import type { Message } from "@/store/option"

export type PlaygroundToolResult = {
  content: string
  toolCallId?: string
  toolName?: string
  toolServerName?: string
  toolError?: boolean
}

export type PlaygroundToolInvocation = {
  id: string
  name: string
  displayName: string
  serverName?: string
  result?: PlaygroundToolResult
}

export type PlaygroundMessageSegment =
  | {
      type: "text"
      key: string
      message: Message
    }
  | {
      type: "tool_invocations"
      key: string
      content: string
      invocations: PlaygroundToolInvocation[]
    }

export type PlaygroundMessageGroup = Message & {
  startIndex: number
  endIndex: number
  actionIndex: number
  segments: PlaygroundMessageSegment[]
}

const createToolResult = (message: Message): PlaygroundToolResult => ({
  content: message.message,
  toolCallId: message.toolCallId,
  toolName: message.toolName,
  toolServerName: message.toolServerName,
  toolError: message.toolError
})

const createToolInvocation = (
  toolCall: McpToolCall,
  result?: PlaygroundToolResult
): PlaygroundToolInvocation => {
  const parsedTool = parseMcpToolName(toolCall.name)

  return {
    id: toolCall.id,
    name: toolCall.name,
    displayName: toolCall.displayName || parsedTool.displayName,
    serverName: toolCall.serverName || parsedTool.serverName,
    result
  }
}

const createFallbackInvocation = (
  message: Message,
  index: number
): PlaygroundToolInvocation => {
  const fallbackName = message.toolName || "Tool"
  const parsedTool = parseMcpToolName(fallbackName)

  return {
    id: message.toolCallId || `tool-result-${index}`,
    name: fallbackName,
    displayName: message.toolName || parsedTool.displayName,
    serverName: message.toolServerName || parsedTool.serverName,
    result: createToolResult(message)
  }
}

const createToolInvocationSegment = (
  assistantMessage: Message,
  toolResultMessages: Message[],
  index: number
): PlaygroundMessageSegment => {
  const pendingResults = [...toolResultMessages]
  const resultsByToolCallId = new Map<string, PlaygroundToolResult>()

  for (const toolResultMessage of toolResultMessages) {
    if (toolResultMessage.toolCallId) {
      resultsByToolCallId.set(
        toolResultMessage.toolCallId,
        createToolResult(toolResultMessage)
      )
    }
  }

  const invocations = (assistantMessage.toolCalls || []).map((toolCall) => {
    const matchedResult = toolCall.id
      ? resultsByToolCallId.get(toolCall.id)
      : undefined

    if (matchedResult) {
      resultsByToolCallId.delete(toolCall.id)
      const matchedIndex = pendingResults.findIndex(
        (currentResult) => currentResult.toolCallId === toolCall.id
      )

      if (matchedIndex !== -1) {
        pendingResults.splice(matchedIndex, 1)
      }
    }

    const fallbackResult = matchedResult
      ? undefined
      : pendingResults.length > 0
        ? createToolResult(pendingResults.shift()!)
        : undefined

    return createToolInvocation(toolCall, matchedResult || fallbackResult)
  })

  for (const unmatchedResult of pendingResults) {
    invocations.push(createFallbackInvocation(unmatchedResult, index + invocations.length))
  }

  return {
    type: "tool_invocations",
    key: `tool-${index}`,
    content: assistantMessage.message,
    invocations
  }
}

const createTextSegment = (
  message: Message,
  index: number
): PlaygroundMessageSegment => ({
  type: "text",
  key: `text-${index}`,
  message
})

const findActionIndex = (
  messages: Message[],
  startIndex: number,
  endIndex: number
) => {
  for (let index = endIndex; index >= startIndex; index -= 1) {
    const message = messages[index]

    if (!message.messageKind || message.messageKind === "text") {
      return index
    }
  }

  return endIndex
}

const buildAssistantSegments = (
  messages: Message[],
  startIndex: number,
  endIndex: number
) => {
  const segments: PlaygroundMessageSegment[] = []

  for (let index = startIndex; index <= endIndex; index += 1) {
    const message = messages[index]

    if (message.messageKind === "assistant_tool_calls") {
      const toolResultMessages: Message[] = []
      let cursor = index + 1

      while (
        cursor <= endIndex &&
        messages[cursor]?.messageKind === "tool_result"
      ) {
        toolResultMessages.push(messages[cursor])
        cursor += 1
      }

      segments.push(
        createToolInvocationSegment(message, toolResultMessages, index)
      )
      index = cursor - 1
      continue
    }

    if (message.messageKind === "tool_result") {
      segments.push(
        createToolInvocationSegment(
          {
            ...message,
            message: "",
            toolCalls: []
          },
          [message],
          index
        )
      )
      continue
    }

    segments.push(createTextSegment(message, index))
  }

  return segments
}

export const buildPlaygroundMessageGroups = (
  messages: Message[]
): PlaygroundMessageGroup[] => {
  const groups: PlaygroundMessageGroup[] = []

  for (let index = 0; index < messages.length; index += 1) {
    const currentMessage = messages[index]

    if (!currentMessage.isBot) {
      groups.push({
        ...currentMessage,
        startIndex: index,
        endIndex: index,
        actionIndex: index,
        segments: [createTextSegment(currentMessage, index)]
      })
      continue
    }

    let endIndex = index

    while (messages[endIndex + 1]?.isBot) {
      endIndex += 1
    }

    const actionIndex = findActionIndex(messages, index, endIndex)
    const actionMessage = messages[actionIndex]

    groups.push({
      ...actionMessage,
      startIndex: index,
      endIndex,
      actionIndex,
      segments: buildAssistantSegments(messages, index, endIndex)
    })

    index = endIndex
  }

  return groups
}
