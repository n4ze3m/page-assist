import { isCustomModel } from "@/db/dexie/models"
import { isTextMessageKind } from "@/libs/mcp/utils"
import { removeReasoning } from "@/libs/reasoning"
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  type MessageContent
} from "@langchain/core/messages"

export const generateHistory = (
  messages: {
    role: "user" | "assistant" | "system" | "tool"
    content: string
    image?: string
    images?: string[]
    messageKind?: "text" | "assistant_tool_calls" | "tool_result"
    toolCalls?: {
      id: string
      name: string
      args?: unknown
      type?: "tool_call"
      serverName?: string
      displayName?: string
    }[]
    toolCallId?: string
    toolName?: string
    toolServerName?: string
    toolError?: boolean
  }[],
  model: string
) => {
  let history = []
  const isCustom = isCustomModel(model)
  for (const message of messages) {
    if (message.role === "user") {
      let content: MessageContent = isCustom
        ? message.content
        : [
            {
              type: "text",
              text: message.content
            }
          ]

      // Use images array if available, otherwise fall back to single image
      const imagesToUse = message.images && message.images.length > 0
        ? message.images
        : (message.image ? [message.image] : [])

      if (imagesToUse.length > 0) {
        content = [
          {
            type: "text",
            text: message.content
          }
        ]

        // Add all images to content
        imagesToUse.forEach((img) => {
          if (img && img.length > 0) {
            //@ts-ignore
            content.push({
              type: "image_url",
              image_url: !isCustom
                ? img
                : {
                    url: img
                  }
            })
          }
        })
      }
      history.push(
        new HumanMessage({
          content: content
        })
      )
    } else if (message.role === "assistant") {
      if (message.messageKind === "assistant_tool_calls") {
        history.push(
          new AIMessage({
            content: message.content || "",
            tool_calls: (message.toolCalls || []).map((toolCall) => ({
              id: toolCall.id,
              name: toolCall.name,
              args: toolCall.args || {},
              type: "tool_call"
            }))
          })
        )
        continue
      }

      history.push(
        new AIMessage({
          content: isTextMessageKind(message.messageKind)
            ? isCustom
              ? removeReasoning(message.content)
              : [
                  {
                    type: "text",
                    text: removeReasoning(message.content)
                  }
                ]
            : message.content
        })
      )
    } else if (message.role === "tool") {
      history.push(
        new ToolMessage({
          content: message.content,
          tool_call_id: message.toolCallId || "",
          status: message.toolError ? "error" : "success"
        })
      )
    }
  }
  return history
}
