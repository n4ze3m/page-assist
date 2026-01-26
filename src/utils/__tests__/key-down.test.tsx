import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { handleChatInputKeyDown } from "@/utils/key-down"

describe("handleChatInputKeyDown", () => {
  const baseEvent = {
    key: "Enter",
    shiftKey: false,
    nativeEvent: { isComposing: false }
  } as any

  beforeEach(() => {
    vi.stubEnv("BROWSER", "chrome")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns true when enter pressed and ready", () => {
    const r = handleChatInputKeyDown({
      e: baseEvent,
      sendWhenEnter: true,
      typing: false,
      isSending: false
    })
    expect(r).toBe(true)
  })
  it("returns false when typing or sending", () => {
    expect(
      handleChatInputKeyDown({
        e: baseEvent,
        sendWhenEnter: true,
        typing: true,
        isSending: false
      })
    ).toBe(false)
    expect(
      handleChatInputKeyDown({
        e: baseEvent,
        sendWhenEnter: true,
        typing: false,
        isSending: true
      })
    ).toBe(false)
  })
})
