import { describe, it, expect } from "vitest"
import { humanizeMilliseconds } from "@/utils/humanize-milliseconds"

describe("humanizeMilliseconds", () => {
  it("formats ms under 1s", () => {
    expect(humanizeMilliseconds(500)).toBe("500ms")
  })
  it("formats seconds", () => {
    expect(humanizeMilliseconds(10_000)).toBe("10s")
  })
  it("formats minutes", () => {
    expect(humanizeMilliseconds(60_000 - 1)).toBe("59s")
  })
  it("formats hours and days", () => {
    expect(humanizeMilliseconds(3_600_000)).toBe("1h")
    expect(humanizeMilliseconds(86_400_000)).toBe("1d")
  })
})
