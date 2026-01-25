import { describe, it, expect, vi, beforeEach } from "vitest"
import { getOllamaURL } from "@/services/ai/ollama"

const mockStorage = {
  get: vi.fn()
}

vi.mock("@plasmohq/storage", () => ({
  Storage: vi.fn().mockImplementation(() => mockStorage)
}))

vi.mock("../../libs/clean-url", () => ({
  cleanUrl: vi.fn((url) => url)
}))

vi.mock("../../libs/runtime", () => ({
  urlRewriteRuntime: vi.fn()
}))

describe("getOllamaURL", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns default URL when storage is empty", async () => {
    mockStorage.get.mockResolvedValue("")

    const result = await getOllamaURL()

    expect(result).toBe("http://127.0.0.1:11434")
    expect(mockStorage.get).toHaveBeenCalledWith("ollamaURL")
  })

  it("returns stored URL when available", async () => {
    const storedUrl = "http://localhost:11434"
    mockStorage.get.mockResolvedValue(storedUrl)

    const result = await getOllamaURL()

    expect(result).toBe(storedUrl)
    expect(mockStorage.get).toHaveBeenCalledWith("ollamaURL")
  })
})
