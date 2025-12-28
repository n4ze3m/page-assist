import { isCustomModel } from "@/db/dexie/models"
import { removeReasoning } from "@/libs/reasoning"
import {
  HumanMessage,
  AIMessage,
  type MessageContent
} from "@langchain/core/messages"

export const generateHistory = (
  messages: {
    role: "user" | "assistant" | "system"
    content: string
    image?: string
    images?: string[]
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
      history.push(
        new AIMessage({
          content: isCustom
            ? removeReasoning(message.content)
            : [
                {
                  type: "text",
                  text: removeReasoning(message.content)
                }
              ]
        })
      )
    }
  }
  return history
}
