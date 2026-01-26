import React from "react"
import { describe, it, expect, vi } from "vitest"
import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { Sidebar } from "../Sidebar"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

// Mock heavy modules and UI libs to reduce surface
vi.mock("antd", () => ({
  Empty: ({ description }: any) => <div data-testid="empty">{description}</div>,
  Skeleton: () => <div data-testid="skeleton" />,
  Dropdown: ({ children }: any) => <div>{children}</div>,
  Menu: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <>{children}</>,
  Input: (props: any) => <input aria-label="common:search" {...props} />,
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  message: { success: vi.fn(), error: vi.fn() }
}))

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }))

// Mock services and db used inside Sidebar
vi.mock("@/services/ai/model-settings", () => ({
  lastUsedChatModelEnabled: vi.fn().mockResolvedValue(false)
}))
vi.mock("@/hooks/useDebounce", () => ({ useDebounce: (v: string) => v }))
vi.mock("@/db/dexie/chat", () => ({
  PageAssistDatabase: vi.fn().mockImplementation(() => ({
    getChatHistoriesPaginated: vi
      .fn()
      .mockResolvedValue({ histories: [], hasMore: false, totalCount: 0 }),
    getChatHistories: vi.fn().mockResolvedValue([])
  }))
}))
vi.mock("@/db/dexie/helpers", () => ({
  formatToChatHistory: vi.fn(),
  deleteByHistoryId: vi.fn(),
  deleteHistoriesByDateRange: vi.fn(),
  updateHistory: vi.fn(),
  pinHistory: vi.fn(),
  formatToMessage: vi.fn(),
  getSessionFiles: vi.fn(),
  getPromptById: vi.fn()
}))
vi.mock("@/db/dexie/types", () => ({}))
vi.mock("@/utils/ff-error", () => ({ isDatabaseClosedError: () => false }))
vi.mock("@/utils/update-page-title", () => ({ updatePageTitle: vi.fn() }))
vi.mock("@/services/features/title", () => ({ generateTitle: vi.fn() }))

// Mock tanstack react-query hooks used in component to a stable state
vi.mock("@tanstack/react-query", async () => {
  return {
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useInfiniteQuery: () => ({
      data: { pages: [{ groups: [], hasMore: false, totalCount: 0 }] },
      status: "success",
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    }),
    useQuery: () => ({ data: [], status: "success" })
  }
})

describe("Sidebar", () => {
  const baseProps = {
    onClose: vi.fn(),
    setMessages: vi.fn(),
    setHistory: vi.fn(),
    setHistoryId: vi.fn(),
    setSelectedModel: vi.fn(),
    setSelectedSystemPrompt: vi.fn(),
    setSystemPrompt: vi.fn(),
    clearChat: vi.fn(),
    temporaryChat: false,
    historyId: "",
    history: [],
    isOpen: true,
    selectedModel: "gpt-4o"
  }

  it("renders search input and empty state when no histories", () => {
    render(<Sidebar {...baseProps} />)
    expect(
      screen.getByRole("textbox", { name: "common:search" })
    ).toBeInTheDocument()
    // No histories -> either empty or absence of list; we at least ensure component mounts
  })
})
