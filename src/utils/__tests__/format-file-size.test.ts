import { describe, it, expect } from "vitest"
import { formatFileSize } from "@/utils/format-file-size"

describe("formatFileSize", () => {
  it("handles zero", () => {
    expect(formatFileSize(0)).toBe("0 Bytes")
  })
  it("formats KB and MB", () => {
    expect(formatFileSize(1024)).toBe("1 KB")
    expect(formatFileSize(1024 * 1024)).toBe("1 MB")
  })
})
