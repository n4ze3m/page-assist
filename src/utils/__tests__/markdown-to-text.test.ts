import { describe, it, expect } from "vitest"
import { markdownToText } from "@/utils/markdown-to-text"

describe("markdownToText", () => {
  it("strips markdown, code, html, svg", () => {
    const md =
      "# Title\nSome **bold** `code` and <svg></svg>\n\n- item1\n1. item2\n> quote\n![](img)\n[link](url)"
    const t = markdownToText(md)
    expect(t).toContain("Title")
    expect(t).toContain("Some bold code")
    expect(t).not.toContain("<svg")
  })
})
