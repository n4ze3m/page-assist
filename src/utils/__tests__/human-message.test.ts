import { describe, it, expect, vi } from "vitest"
import { humanMessageFormatter } from "@/utils/human-message"

vi.mock("@/db/dexie/models", () => ({
  isCustomModel: (m: string) => m === "custom"
}))
vi.mock("@/utils/ocr", () => ({
  processImageForOCR: vi.fn(async () => "OCR_TEXT")
}))

describe("humanMessageFormatter", () => {
  it("reformats content for custom model with image_url", async () => {
    const msg = await humanMessageFormatter({
      content: [
        { type: "text", text: "t" },
        { type: "image_url", image_url: "u" }
      ] as any,
      model: "custom",
      useOCR: false
    })
    expect((msg as any).content[1].image_url.url).toBe("u")
  })

  it("injects OCR text when useOCR for custom", async () => {
    const msg = await humanMessageFormatter({
      content: [
        { type: "text", text: "t" },
        { type: "image_url", image_url: "u" }
      ] as any,
      model: "custom",
      useOCR: true
    })
    expect((msg as any).content).toContain("OCR_TEXT")
  })

  it("passes through content for non-custom without OCR", async () => {
    const msg = await humanMessageFormatter({
      content: "hello",
      model: "openai",
      useOCR: false
    })
    expect((msg as any).content).toBe("hello")
  })
})
