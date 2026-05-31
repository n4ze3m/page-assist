import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/libs/clean-url", () => ({ cleanUrl: (s: string) => s }))
vi.mock("@/services/search", () => ({
  getIsSimpleInternetSearch: vi.fn(),
  totalSearchResults: vi.fn().mockResolvedValue(3),
  getPerplexityApiKey: vi.fn().mockResolvedValue("test-key")
}))
vi.mock("@/services/ollama", () => ({
  defaultEmbeddingModelForRag: vi.fn().mockResolvedValue("embed-model"),
  getOllamaURL: vi.fn().mockResolvedValue("http://localhost:11434"),
  getSelectedModel: vi.fn().mockResolvedValue("llm-model")
}))
vi.mock("@/loader/html", () => ({
  PageAssistHtmlLoader: vi.fn().mockImplementation(({ url }: any) => ({
    loadByURL: vi
      .fn()
      .mockResolvedValue([
        { pageContent: `content for ${url}`, metadata: { url } }
      ])
  }))
}))
vi.mock("@/utils/text-splitter", () => ({
  getPageAssistTextSplitter: vi.fn().mockResolvedValue({
    splitDocuments: vi
      .fn()
      .mockImplementation(async (docs: any[]) => docs.map((d) => ({ ...d })))
  })
}))
vi.mock("@/models/embedding", () => ({
  pageAssistEmbeddingModel: vi.fn().mockResolvedValue({})
}))

vi.mock("@langchain/classic/vectorstores/memory", () => {
  return {
    MemoryVectorStore: class {
      addDocuments = vi.fn().mockResolvedValue(undefined)
      similaritySearch = vi.fn().mockResolvedValue([
        { pageContent: "chunk A", metadata: { url: "https://a.example" } },
        { pageContent: "chunk B", metadata: { url: "https://b.example" } }
      ])
    }
  }
})

import { perplexityAPISearch } from "../perplexity-api"
import {
  getIsSimpleInternetSearch,
  getPerplexityApiKey
} from "@/services/search"

const mockFetch = (
  results: Array<{ title: string; url: string; snippet: string }>
) => {
  vi.spyOn(global, "fetch" as any).mockResolvedValue({
    ok: true,
    json: async () => ({ results })
  } as any)
}

describe("perplexityAPISearch", () => {
  it("returns simple mapped results when simple mode is enabled", async () => {
    ;(getIsSimpleInternetSearch as any).mockResolvedValue(true)
    ;(getPerplexityApiKey as any).mockResolvedValue("test-key")
    mockFetch([
      { title: "T1", url: "https://one", snippet: "S1" },
      { title: "T2", url: "https://two", snippet: "S2" }
    ])

    const out = await perplexityAPISearch("query")
    expect(out).toEqual([
      { url: "https://one", content: "S1" },
      { url: "https://two", content: "S2" }
    ])
  })

  it("builds embeddings store and returns similarity results in embedding mode", async () => {
    ;(getIsSimpleInternetSearch as any).mockResolvedValue(false)
    ;(getPerplexityApiKey as any).mockResolvedValue("test-key")
    mockFetch([
      { title: "T1", url: "https://one", snippet: "S1" },
      { title: "T2", url: "https://two", snippet: "S2" }
    ])

    const out = await perplexityAPISearch("query")
    expect(out).toEqual([
      { url: "https://a.example", content: "chunk A" },
      { url: "https://b.example", content: "chunk B" }
    ])
  })

  it("returns empty list when API response is not ok", async () => {
    ;(getIsSimpleInternetSearch as any).mockResolvedValue(true)
    ;(getPerplexityApiKey as any).mockResolvedValue("test-key")
    vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: false } as any)

    const out = await perplexityAPISearch("query")
    expect(out).toEqual([])
  })

  it("returns empty list on fetch throw", async () => {
    ;(getIsSimpleInternetSearch as any).mockResolvedValue(true)
    ;(getPerplexityApiKey as any).mockResolvedValue("test-key")
    vi.spyOn(global, "fetch" as any).mockRejectedValue(new Error("network"))

    const out = await perplexityAPISearch("query")
    expect(out).toEqual([])
  })
})
