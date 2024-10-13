import { isCustomModel } from "@/db/models"
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

      if (message.image) {
        content = [
          {
            type: "image_url",
            image_url: !isCustom
              ? message.image
              : {
                  url: message.image
                }
          },
          {
            type: "text",
            text: message.content
          }
        ]
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
            ? message.content
            : [
                {
                  type: "text",
                  text: message.content
                }
              ]
        })
      )
    }
  }
  return history
}
