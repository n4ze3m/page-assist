import { describe, it, expect } from "vitest"
import { useStoreMessageOption } from "@/store/option"

describe("useStoreMessageOption", () => {
  it("updates booleans and strings", () => {
    const s = useStoreMessageOption.getState()
    expect(s.streaming).toBe(false)
    useStoreMessageOption.getState().setStreaming(true)
    expect(useStoreMessageOption.getState().streaming).toBe(true)
    useStoreMessageOption.getState().setSelectedModel("m")
    expect(useStoreMessageOption.getState().selectedModel).toBe("m")
    useStoreMessageOption.getState().setWebSearch(true)
    expect(useStoreMessageOption.getState().webSearch).toBe(true)
  })
})
