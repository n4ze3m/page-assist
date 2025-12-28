import { isCustomModel } from "@/db/dexie/models"
import { HumanMessage, type MessageContent } from "@langchain/core/messages"
import { processImageForOCR } from "./ocr"

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
          // Process all images for OCR
          const imageContents = content.filter(
            (c: any) => c.type === "image_url"
          )
          const ocrTexts = await Promise.all(
            imageContents.map((c: any) => processImageForOCR(c.image_url))
          )
          //@ts-ignore
          const ocrPROMPT = `${content[0].text}

[IMAGE OCR TEXT]
${ocrTexts.join("\n\n---\n\n")}`
          return new HumanMessage({
            content: ocrPROMPT
          })
        }

        // Reformat the image_url for all images
        const newContent: MessageContent = [
          {
            type: "text",
            //@ts-ignore
            text: content[0].text
          }
        ]

        // Add all images
        const imageContents = content.filter((c: any) => c.type === "image_url")
        if (imageContents.length > 0) {
          imageContents.forEach((c: any) => {
            if (c.image_url.length > 0) {
              console.log("Adding image to custom model message:", c.image_url)
              newContent.push({
                type: "image_url",
                image_url: {
                  url: c.image_url
                }
              })
            }
          })
        }

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
      // Process all images for OCR
      const imageContents = content.filter((c: any) => c.type === "image_url")
      const ocrTexts = await Promise.all(
        imageContents.map((c: any) => processImageForOCR(c.image_url))
      )
      //@ts-ignore
      const ocrPROMPT = `${content[0].text}

[IMAGE OCR TEXT]
${ocrTexts.join("\n\n---\n\n")}`
      return new HumanMessage({
        content: ocrPROMPT
      })
    }
  }

  return new HumanMessage({
    content
  })
}
