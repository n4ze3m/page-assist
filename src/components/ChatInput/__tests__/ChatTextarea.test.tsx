import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { ChatTextarea } from "../ChatTextarea"

vi.mock("@/hooks/useDynamicTextareaSize", () => ({
  default: vi.fn()
}))

vi.mock("@/hooks/chat-input/useKeydownHandler", () => ({
  useChatKeydown: vi.fn(() => ({
    onKeyDown: vi.fn()
  }))
}))

describe("ChatTextarea", () => {
  it("renders textarea with correct props", () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const setTyping = vi.fn()
    const textareaRef = { current: null }

    render(
      <ChatTextarea
        textareaRef={textareaRef}
        value="test value"
        onChange={onChange}
        sendWhenEnter={true}
        typing={false}
        isSending={false}
        onSubmit={onSubmit}
        setTyping={setTyping}
        placeholder="Type here"
      />
    )

    const textarea = screen.getByPlaceholderText("Type here")
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue("test value")
  })

  it("calls onChange when value changes", () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const setTyping = vi.fn()

    render(
      <ChatTextarea
        textareaRef={{ current: null }}
        value=""
        onChange={onChange}
        sendWhenEnter={true}
        typing={false}
        isSending={false}
        onSubmit={onSubmit}
        setTyping={setTyping}
      />
    )

    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "new value" } })

    expect(onChange).toHaveBeenCalledWith("new value")
  })
})
