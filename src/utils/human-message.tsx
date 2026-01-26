import { isCustomModel } from "@/db/dexie/models"
import { HumanMessage, type MessageContent } from "@langchain/core/messages"
import { processImageForOCR } from "@/utils/ocr"
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
    // Memory context enrichment (optional)
    const enableMemory = await storage.get("enableMemory")
    let memoryContext = ""

    if (enableMemory) {
      const context = await getMemoriesAsContext()
      if (context) memoryContext = `\n\n${context}`
    }

    const isCustom = isCustomModel(model)

    // Custom model handling (multi-image aware)
    if (isCustom && typeof content !== "string" && content.length > 0) {
      if (content.length > 1) {
        if (useOCR) {
          // Process all images for OCR and append to prompt
          const imageContents = (content as any[]).filter(
            (c) => c.type === "image_url"
          )
          const ocrTexts = await Promise.all(
            imageContents.map((c: any) =>
              processImageForOCR(String(c.image_url))
            )
          )
          // @ts-ignore
          const baseText = (content as any[])[0]?.text ?? ""
          const ocrPROMPT = `${baseText}\n\n[IMAGE OCR TEXT]\n${ocrTexts.join("\n\n---\n\n")}${memoryContext}`
          return new HumanMessage({ content: ocrPROMPT })
        }

        // Reformat payload to include all images explicitly, plus memoryContext on text
        const newContent: MessageContent = [
          {
            type: "text",
            // @ts-ignore
            text: String((content as any[])[0]?.text ?? "") + memoryContext
          }
        ]
        const imageContents = (content as any[]).filter(
          (c) => c.type === "image_url"
        )
        imageContents.forEach((c: any) => {
          if (c?.image_url) {
            newContent.push({
              type: "image_url",
              image_url: { url: String(c.image_url) }
            } as any)
          }
        })
        return new HumanMessage({ content: newContent })
      }

      // Single non-text item fallback
      return new HumanMessage({
        // @ts-ignore
        content: String((content as any[])[0]?.text ?? "") + memoryContext
      })
    }

    // Non-custom model handling
    if (
      useOCR &&
      typeof content !== "string" &&
      (content as any[]).length > 1
    ) {
      // OCR for all images, append to first text
      const imageContents = (content as any[]).filter(
        (c) => c.type === "image_url"
      )
      const ocrTexts = await Promise.all(
        imageContents.map((c: any) => processImageForOCR(String(c.image_url)))
      )
      // @ts-ignore
      const baseText = (content as any[])[0]?.text ?? ""
      const ocrPROMPT = `${baseText}\n\n[IMAGE OCR TEXT]\n${ocrTexts.join("\n\n---\n\n")}${memoryContext}`
      return new HumanMessage({ content: ocrPROMPT })
    }

    // Plain string content
    if (typeof content === "string") {
      return new HumanMessage({ content: content + memoryContext })
    }

    // Array content without images or OCR disabled: join text parts
    if (Array.isArray(content)) {
      return new HumanMessage({
        content:
          (content as any[])
            .map((c) => (typeof c?.text === "string" ? c.text : ""))
            .join(" ") + memoryContext
      })
    }

    // Fallback
    return new HumanMessage({ content })
  } catch (_) {
    return new HumanMessage({ content })
  }
}
