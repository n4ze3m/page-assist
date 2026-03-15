import React from "react"
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
  args?: unknown
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
  renderKey: string
  startIndex: number
  endIndex: number
  actionIndex: number
  segments: PlaygroundMessageSegment[]
  sourceMessages: Message[]
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
    args: toolCall.args,
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

const isMessageEqual = (a: Message, b: Message) => {
  if (a === b) return true
  return (
    a.message === b.message &&
    a.isBot === b.isBot &&
    a.id === b.id &&
    a.messageKind === b.messageKind &&
    a.toolCallId === b.toolCallId &&
    a.toolError === b.toolError &&
    a.toolCalls === b.toolCalls &&
    a.generationInfo === b.generationInfo &&
    a.reasoning_time_taken === b.reasoning_time_taken
  )
}

const areSourceMessagesEqual = (
  sourceMessages: Message[],
  messages: Message[],
  startIndex: number,
  endIndex: number
) => {
  if (sourceMessages.length !== endIndex - startIndex + 1) {
    return false
  }

  for (let index = startIndex; index <= endIndex; index += 1) {
    if (!isMessageEqual(sourceMessages[index - startIndex], messages[index])) {
      return false
    }
  }

  return true
}

const createRenderKey = (sourceMessages: Message[], startIndex: number) => {
  const keyParts = sourceMessages
    .map((message, index) => message.id || `${startIndex + index}-${message.isBot ? "bot" : "user"}`)
    .join(":")

  return keyParts || `group-${startIndex}`
}

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
      if (message.message && message.message.trim().length > 0) {
        segments.push(createTextSegment(message, index))
      }

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
        createToolInvocationSegment(
          { ...message, message: "" },
          toolResultMessages,
          index
        )
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
  messages: Message[],
  previousGroups: PlaygroundMessageGroup[] = []
): PlaygroundMessageGroup[] => {
  const groups: PlaygroundMessageGroup[] = []
  let groupIndex = 0

  for (let index = 0; index < messages.length; index += 1) {
    const currentMessage = messages[index]

    if (!currentMessage.isBot) {
      const previousGroup = previousGroups[groupIndex]

      if (
        previousGroup &&
        previousGroup.startIndex === index &&
        previousGroup.endIndex === index &&
        previousGroup.actionIndex === index &&
        areSourceMessagesEqual(previousGroup.sourceMessages, messages, index, index)
      ) {
        groups.push(previousGroup)
      } else {
        const sourceMessages = [currentMessage]
        groups.push({
          ...currentMessage,
          renderKey: createRenderKey(sourceMessages, index),
          startIndex: index,
          endIndex: index,
          actionIndex: index,
          segments: [createTextSegment(currentMessage, index)],
          sourceMessages
        })
      }
      groupIndex += 1
      continue
    }

    let endIndex = index

    while (messages[endIndex + 1]?.isBot) {
      endIndex += 1
    }

    const actionIndex = findActionIndex(messages, index, endIndex)
    const previousGroup = previousGroups[groupIndex]

    if (
      previousGroup &&
      previousGroup.startIndex === index &&
      previousGroup.endIndex === endIndex &&
      previousGroup.actionIndex === actionIndex &&
      areSourceMessagesEqual(previousGroup.sourceMessages, messages, index, endIndex)
    ) {
      groups.push(previousGroup)
    } else {
      const actionMessage = messages[actionIndex]
      const sourceMessages = messages.slice(index, endIndex + 1)

      groups.push({
        ...actionMessage,
        renderKey: createRenderKey(sourceMessages, index),
        startIndex: index,
        endIndex,
        actionIndex,
        segments: buildAssistantSegments(messages, index, endIndex),
        sourceMessages
      })
    }
    groupIndex += 1

    index = endIndex
  }

  return groups
}

export const usePlaygroundMessageGroups = (messages: Message[]) => {
  const previousGroupsRef = React.useRef<PlaygroundMessageGroup[]>([])

  return React.useMemo(() => {
    const groups = buildPlaygroundMessageGroups(messages, previousGroupsRef.current)
    previousGroupsRef.current = groups
    return groups
  }, [messages])
}
