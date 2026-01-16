import { describe, it, expect, vi } from "vitest"
import { normalizeThinking } from "@/store/model"

vi.mock("~/libs/model-utils", () => ({
  isGptOssModel: (id: string | null) => id === "gpt-oss"
}))

describe("normalizeThinking", () => {
  it("handles undefined and boolean for non-oss", () => {
    expect(normalizeThinking(undefined, "x")).toBeUndefined()
    expect(normalizeThinking(false as any, "x")).toBe(false)
    expect(normalizeThinking(true as any, "x")).toBe(true)
  })
  it("maps values for gpt-oss", () => {
    expect(normalizeThinking(false as any, "gpt-oss")).toBe("low")
    expect(normalizeThinking(true as any, "gpt-oss")).toBe("medium")
    expect(normalizeThinking("high" as any, "gpt-oss")).toBe("high")
  })
  it("string to boolean for others", () => {
    expect(normalizeThinking("low" as any, "other")).toBe(true)
  })
})
