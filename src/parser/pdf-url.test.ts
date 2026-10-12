import { describe, expect, test } from "bun:test"
import { looksLikePdfUrl, isPdfResponse } from "./pdf-url"

describe("looksLikePdfUrl", () => {
  test("matches path ending in .pdf", () => {
    expect(looksLikePdfUrl("https://example.com/docs/spec.pdf")).toBe(true)
    expect(
      looksLikePdfUrl(
        "https://www.canadalite.com/Pdf/Philips/Advance%20Ballasts.pdf"
      )
    ).toBe(true)
  })

  test("matches query/hash after .pdf", () => {
    expect(looksLikePdfUrl("https://example.com/a.pdf?download=1")).toBe(true)
    expect(looksLikePdfUrl("https://example.com/a.PDF#page=2")).toBe(true)
  })

  test("rejects non-pdf paths", () => {
    expect(looksLikePdfUrl("https://example.com/docs/spec.html")).toBe(false)
    expect(looksLikePdfUrl("https://example.com/pdf/viewer")).toBe(false)
  })
})

describe("isPdfResponse", () => {
  test("detects application/pdf content-type", () => {
    const response = new Response(null, {
      headers: { "content-type": "application/pdf; charset=binary" }
    })
    expect(isPdfResponse(response, "https://example.com/download")).toBe(true)
  })

  test("falls back to URL when content-type is generic", () => {
    const response = new Response(null, {
      headers: { "content-type": "application/octet-stream" }
    })
    expect(isPdfResponse(response, "https://example.com/file.pdf")).toBe(true)
    expect(isPdfResponse(response, "https://example.com/file.html")).toBe(
      false
    )
  })
})
