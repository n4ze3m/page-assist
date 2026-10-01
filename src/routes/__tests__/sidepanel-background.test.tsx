import { render } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import SidepanelChat from "../sidepanel-chat"

const state = vi.hoisted(() => ({
  background: null as { type: string; text: string } | null,
  streaming: false,
  submissions: [] as string[]
}))
vi.mock("@/hooks/useBackgroundMessage", () => ({
  default: () => state.background
}))
vi.mock("@/hooks/useMessage", () => ({
  useMessage: () => ({
    messages: [],
    streaming: state.streaming,
    selectedModel: "test-model",
    onSubmit: async ({ message }) => {
      state.submissions.push(message)
    }
  })
}))
vi.mock("@/hooks/useMigration", () => ({ useMigration: () => {} }))
vi.mock("@/hooks/useSmartScroll", () => ({
  useSmartScroll: () => ({
    containerRef: { current: null },
    isAutoScrollToBottom: true
  })
}))
vi.mock("@/hooks/keyboard/useKeyboardShortcuts", () => ({
  useChatShortcuts: () => {},
  useSidebarShortcuts: () => {},
  useChatModeShortcuts: () => {}
}))
vi.mock("@/services/features/app", () => ({
  copilotResumeLastChat: async () => false
}))
vi.mock("@plasmohq/storage/hook", () => ({ useStorage: () => [false] }))
vi.mock("@/components/Sidepanel/Chat/body", () => ({
  SidePanelBody: () => null
}))
vi.mock("@/components/Sidepanel/Chat/form", () => ({
  SidepanelForm: () => null
}))
vi.mock("@/components/Sidepanel/Chat/header", () => ({
  SidepanelHeader: () => null
}))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}))

describe("background prompts", () => {
  beforeEach(() => {
    state.background = null
    state.streaming = false
    state.submissions = []
  })
  it("processes distinct requests with identical text once each", () => {
    const { rerender } = render(<SidepanelChat />)
    state.background = { type: "summarize", text: "same selection" }
    rerender(<SidepanelChat />)
    state.streaming = true
    rerender(<SidepanelChat />)
    state.streaming = false
    rerender(<SidepanelChat />)
    expect(state.submissions).toEqual(["same selection"])
    state.background = { type: "summarize", text: "same selection" }
    rerender(<SidepanelChat />)
    expect(state.submissions).toEqual(["same selection", "same selection"])
  })
  it("defers a new request while streaming", () => {
    state.streaming = true
    state.background = { type: "summarize", text: "selection" }
    const { rerender } = render(<SidepanelChat />)
    expect(state.submissions).toEqual([])
    state.streaming = false
    rerender(<SidepanelChat />)
    expect(state.submissions).toEqual(["selection"])
  })
})
