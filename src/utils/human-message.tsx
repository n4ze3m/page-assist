import { isCustomModel } from "@/db/models"
import { HumanMessage, type MessageContent } from "@langchain/core/messages"

type HumanMessageType = {
  content: MessageContent
  model: string
}

export const humanMessageFormatter = ({ content, model }: HumanMessageType) => {
  const isCustom = isCustomModel(model)

  if (isCustom) {
    if (typeof content !== "string") {
      if (content.length > 1) {
        // this means that we need to reformat the image_url
        const newContent: MessageContent = [
          {
            type: "text",
            //@ts-ignore
            text: content[0].text
          },
          {
            type: "image_url",
            image_url: {
              //@ts-ignore
              url: content[1].image_url
            }
          }
        ]

        return new HumanMessage({
          content: newContent
        })
      } else {
        return new HumanMessage({
          //@ts-ignore
          content: content[0].text
        })
      }
    }
  }

  return new HumanMessage({
    content
  })
}
