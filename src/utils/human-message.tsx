import { isCustomModel } from "@/db/dexie/models"
import { HumanMessage, type MessageContent } from "@langchain/core/messages"
import { processImageForOCR } from "./ocr"
import { Storage } from "@plasmohq/storage"
import { getMemoriesAsContext } from "@/db/dexie/memory"

const storage = new Storage()

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
  try {
    // Get memory context if enabled
    const enableMemory = await storage.get("enableMemory")
    let memoryContext = ""

    if (enableMemory) {
      const context = await getMemoriesAsContext()
      if (context) {
        memoryContext = `\n\n${context}`
      }
    }

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
${ocrTexts.join("\n\n---\n\n")}${memoryContext}`
            return new HumanMessage({
              content: ocrPROMPT
            })
          }

          // Reformat the image_url for all images
          const newContent: MessageContent = [
            {
              type: "text",
              //@ts-ignore
              text: content[0].text + memoryContext
            }
          ]

          // Add all images
          const imageContents = content.filter(
            (c: any) => c.type === "image_url"
          )
          if (imageContents.length > 0) {
            imageContents.forEach((c: any) => {
              if (c.image_url.length > 0) {
                console.log(
                  "Adding image to custom model message:",
                  c.image_url
                )
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
            content: content[0].text + memoryContext
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
${ocrTexts.join("\n\n---\n\n")}${memoryContext}`
        return new HumanMessage({
          content: ocrPROMPT
        })
      }
    }
 
    // Handle string content or fallback
    if (typeof content === "string") {
      return new HumanMessage({
        content: content + memoryContext
      })
    }


    if (Array.isArray(content)) {
      return new HumanMessage({
        content: content?.map((c: any, index: number) => 
          c.type === "text" && index === 0 ? { ...c, text: c.text + memoryContext } : c
        )
      })
    }


    return new HumanMessage({
      content
    })
  } catch (e) {
    return new HumanMessage({
      content
    })
  }
}
