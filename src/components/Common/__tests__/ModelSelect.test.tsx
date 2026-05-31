import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ModelSelect } from "../ModelSelect"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

// Mock useMessage so we don't pull heavy logic
vi.mock("@/hooks/useMessage", () => ({
  useMessage: () => ({ selectedModel: null, setSelectedModel: vi.fn() })
}))

// Mock fetchChatModels for React Query
vi.mock("@/services/ai/ollama", () => ({
  fetchChatModels: vi.fn().mockResolvedValue([
    { name: "m1", model: "gpt-4o", nickname: "GPT 4o", provider: "openai" },
    { name: "m2", model: "llama3", nickname: "Llama 3", provider: "ollama" }
  ])
}))

describe("ModelSelect", () => {
  it("renders dropdown trigger and shows items", async () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <ModelSelect />
      </QueryClientProvider>
    )

    const trigger = await screen.findByRole("button")
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText(/GPT 4o/)).toBeInTheDocument()
      expect(screen.getByText(/Llama 3/)).toBeInTheDocument()
    })
  })
})
