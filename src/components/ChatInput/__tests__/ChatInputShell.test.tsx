import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { ChatInputShell } from "../ChatInputShell"

vi.mock("../parts/ImagePreview", () => ({
  ImagePreview: ({ src, onClear }: any) =>
    src ? (
      <div data-testid="image-preview" onClick={onClear}>
        Image
      </div>
    ) : null
}))

describe("ChatInputShell", () => {
  it("renders textarea and controls", () => {
    render(
      <ChatInputShell
        onSubmit={vi.fn()}
        fileInputRef={{ current: null }}
        onFileChange={vi.fn()}
        textareaComponent={<textarea data-testid="textarea" />}
        controlsComponent={<button data-testid="controls">Send</button>}
      />
    )

    expect(screen.getByTestId("textarea")).toBeInTheDocument()
    expect(screen.getByTestId("controls")).toBeInTheDocument()
  })

  it("renders image preview when image is provided", () => {
    render(
      <ChatInputShell
        image="test-image"
        onClearImage={vi.fn()}
        onSubmit={vi.fn()}
        fileInputRef={{ current: null }}
        onFileChange={vi.fn()}
        textareaComponent={<textarea />}
        controlsComponent={<button>Send</button>}
      />
    )

    expect(screen.getByTestId("image-preview")).toBeInTheDocument()
  })

  it("sets data-istemporary-chat attribute", () => {
    const { container } = render(
      <ChatInputShell
        temporaryChat={true}
        onSubmit={vi.fn()}
        fileInputRef={{ current: null }}
        onFileChange={vi.fn()}
        textareaComponent={<textarea />}
        controlsComponent={<button>Send</button>}
      />
    )

    expect(container.firstChild).toHaveAttribute(
      "data-istemporary-chat",
      "true"
    )
  })
})
