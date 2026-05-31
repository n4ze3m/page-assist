import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ShareModal } from "../ShareModal"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

// Mock helpers and services used inside ShareModal
vi.mock("@/db/dexie/helpers", () => ({
  getTitleById: vi.fn().mockResolvedValue("Loaded Title"),
  getUserId: vi.fn().mockResolvedValue("user-1"),
  saveWebshare: vi.fn().mockResolvedValue(undefined)
}))

vi.mock("@/services/ai/ollama", () => ({
  getPageShareUrl: vi.fn().mockResolvedValue("http://localhost/")
}))

vi.mock("@/libs/fetcher", () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ chat_id: "chat-123", title: "Loaded Title" })
  })
}))

vi.mock("@/db/dexie/models", () => ({
  removeModelSuffix: (s: string) => s
}))

// Simplify Markdown rendering for tests
vi.mock("../Markdown", () => ({
  default: (props: { message: string }) => <div>{props.message}</div>
}))

// Ensure clipboard is available
beforeEach(() => {
  // @ts-ignore
  global.navigator.clipboard = {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

describe("ShareModal", () => {
  const renderModal = (
    override?: Partial<React.ComponentProps<typeof ShareModal>>
  ) => {
    const qc = new QueryClient()
    const setOpen = vi.fn()
    const props = {
      messages: [
        {
          isBot: false,
          message: "Hello",
          images: [],
          name: "user",
          modelName: undefined
        },
        {
          isBot: true,
          message: "Hi there",
          images: [],
          name: "gpt-4o",
          modelName: "gpt-4o"
        }
      ] as any,
      historyId: "hist-1",
      open: true,
      setOpen,
      ...override
    }

    render(
      <QueryClientProvider client={qc}>
        <ShareModal {...props} />
      </QueryClientProvider>
    )

    return { setOpen: props.setOpen as unknown as ReturnType<typeof vi.fn> }
  }

  it("prefills title from history and shows message preview", async () => {
    renderModal()

    // Title should be set from getTitleById
    const titleInput = await screen.findByDisplayValue("Loaded Title")
    expect(titleInput).toBeInTheDocument()

    // Preview messages should be visible (Markdown mocked)
    expect(screen.getByText("Hello")).toBeInTheDocument()
    expect(screen.getByText("Hi there")).toBeInTheDocument()
  })

  it("submits, copies link, saves webshare and closes modal", async () => {
    const { setOpen } = renderModal()

    // Fill in required name if needed (default comes from i18n key but is acceptable)
    const submitBtn = await screen.findByRole("button", {
      name: /share.form.btn.save/i
    })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      // clipboard called with generated URL without trailing slash
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost/share/chat-123"
      )
      // modal closed
      expect(setOpen).toHaveBeenCalledWith(false)
    })
  })
})
