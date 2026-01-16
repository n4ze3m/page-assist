import { describe, it, expect } from "vitest"
import { useWebUI } from "@/store/webui"

describe("useWebUI", () => {
  it("toggles settings", () => {
    expect(useWebUI.getState().sendWhenEnter).toBe(true)
    useWebUI.getState().setSendWhenEnter(false)
    expect(useWebUI.getState().sendWhenEnter).toBe(false)
    expect(useWebUI.getState().ttsEnabled).toBe(true)
    useWebUI.getState().setTTSEnabled(false)
    expect(useWebUI.getState().ttsEnabled).toBe(false)
  })
})
