import { isCustomModel } from "@/db/models"
import { HumanMessage, type MessageContent } from "@langchain/core/messages"

type HumanMessageType = {
  content: MessageContent
  model: string
  useOCR: boolean
}

export const humanMessageFormatter = async ({
  content,
  model,
  useOCR = false
}: HumanMessageType) => {
  const isCustom = isCustomModel(model)

  if (isCustom) {
    if (typeof content !== "string") {
      if (content.length > 1) {
        if (useOCR) {
          //@ts-ignore
          const imageUrl = content[1].image_url
          const ocrText = await processImageForOCR(imageUrl)
          //@ts-ignore
          const ocrPROMPT = `${content[0].text}
          
[IMAGE OCR TEXT]
${ocrText}`
          return new HumanMessage({
            content: ocrPROMPT
          })
        }

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

  if (useOCR) {
    if (typeof content !== "string" && content.length > 1) {
      //@ts-ignore
      const ocrText = await processImageForOCR(content[1].image_url)
      //@ts-ignore
      const ocrPROMPT = `${content[0].text}

[IMAGE OCR TEXT]
${ocrText}`
      return new HumanMessage({
        content: ocrPROMPT
      })
    }
  }

  return new HumanMessage({
    content
  })
}
