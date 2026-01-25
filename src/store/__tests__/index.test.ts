import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useStoreMessage } from "../index"

describe("useStoreMessage", () => {
  it("initializes with default state", () => {
    const { result } = renderHook(() => useStoreMessage())

    expect(result.current.messages).toEqual([])
    expect(result.current.streaming).toBe(false)
    expect(result.current.chatMode).toBe("normal")
    expect(result.current.selectedModel).toBeNull()
  })

  it("sets messages correctly", () => {
    const { result } = renderHook(() => useStoreMessage())

    const newMessages = [
      { isBot: true, name: "Bot", message: "Hello", sources: [] }
    ]
    act(() => {
      result.current.setMessages(newMessages)
    })

    expect(result.current.messages).toEqual(newMessages)
  })

  it("sets streaming state", () => {
    const { result } = renderHook(() => useStoreMessage())

    act(() => {
      result.current.setStreaming(true)
    })

    expect(result.current.streaming).toBe(true)
  })

  it("sets chat mode", () => {
    const { result } = renderHook(() => useStoreMessage())

    act(() => {
      result.current.setChatMode("rag")
    })

    expect(result.current.chatMode).toBe("rag")
  })

  it("sets selected model", () => {
    const { result } = renderHook(() => useStoreMessage())

    act(() => {
      result.current.setSelectedModel("test-model")
    })

    expect(result.current.selectedModel).toBe("test-model")
  })
})
