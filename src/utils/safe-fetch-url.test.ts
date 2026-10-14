import { describe, expect, test } from "bun:test"
import { assertSafeFetchUrl, isPrivateOrReservedHost } from "./safe-fetch-url"

describe("isPrivateOrReservedHost", () => {
  test("rejects loopback and localhost aliases", () => {
    expect(isPrivateOrReservedHost("localhost")).toBe(true)
    expect(isPrivateOrReservedHost("127.0.0.1")).toBe(true)
    expect(isPrivateOrReservedHost("127.1.2.3")).toBe(true)
    expect(isPrivateOrReservedHost("0.0.0.0")).toBe(true)
    expect(isPrivateOrReservedHost("::1")).toBe(true)
    expect(isPrivateOrReservedHost("[::1]")).toBe(true)
  })

  test("rejects RFC1918, link-local, and CGNAT", () => {
    expect(isPrivateOrReservedHost("10.0.0.5")).toBe(true)
    expect(isPrivateOrReservedHost("192.168.1.1")).toBe(true)
    expect(isPrivateOrReservedHost("172.16.0.1")).toBe(true)
    expect(isPrivateOrReservedHost("172.31.255.255")).toBe(true)
    expect(isPrivateOrReservedHost("169.254.169.254")).toBe(true)
    expect(isPrivateOrReservedHost("100.64.0.1")).toBe(true)
  })

  test("rejects .local / single-label hosts", () => {
    expect(isPrivateOrReservedHost("printer.local")).toBe(true)
    expect(isPrivateOrReservedHost("intranet")).toBe(true)
  })

  test("allows ordinary public hostnames", () => {
    expect(isPrivateOrReservedHost("example.com")).toBe(false)
    expect(isPrivateOrReservedHost("docs.github.com")).toBe(false)
    expect(isPrivateOrReservedHost("8.8.8.8")).toBe(false)
    expect(isPrivateOrReservedHost("facebook.com")).toBe(false)
    expect(isPrivateOrReservedHost("fd.example.com")).toBe(false)
  })
})

describe("assertSafeFetchUrl", () => {
  test("allows https public URLs", () => {
    const r = assertSafeFetchUrl("https://example.com/path")
    expect(r.ok).toBe(true)
  })

  test("blocks file and other schemes", () => {
    const r = assertSafeFetchUrl("file:///etc/passwd")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain("scheme")
  })

  test("blocks private destinations mentioned in #954", () => {
    for (const raw of [
      "http://127.0.0.1:11434/api/tags",
      "http://169.254.169.254/latest/meta-data/",
      "http://192.168.0.1/",
      "http://localhost:8080/"
    ]) {
      const r = assertSafeFetchUrl(raw)
      expect(r.ok).toBe(false)
    }
  })
})
