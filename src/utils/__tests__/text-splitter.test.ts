import { describe, it, expect, vi } from "vitest"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

vi.mock("@/services/ai/ollama", () => ({
  defaultEmbeddingChunkSize: async () => 100,
  defaultEmbeddingChunkOverlap: async () => 10,
  defaultSplittingStrategy: async () => "CharacterTextSplitter",
  defaultSsplttingSeparator: async () => "\\n\n"
}))

describe("getPageAssistTextSplitter", () => {
  it("returns CharacterTextSplitter when configured", async () => {
    const s = await getPageAssistTextSplitter()
    expect((s as any).chunkSize).toBe(100)
  })
})
