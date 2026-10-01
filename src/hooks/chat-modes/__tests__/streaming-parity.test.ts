import { describe, it, expect, vi } from "vitest"
import { normalChatMode } from "../normalChatMode"
import { tabChatMode } from "../tabChatMode"
import { searchChatMode } from "../searchChatMode"

const state = vi.hoisted(() => ({ input: [] as any[] }))
vi.mock("@/models", () => ({
  pageAssistModel: async () => ({
    invoke: async () => ({ content: "query" }),
    stream: async function* (input) {
      state.input = input
      yield { content: "response" }
    }
  })
}))
vi.mock("@/services/ai/ollama", () => ({
  getOllamaURL: async () => "http://localhost",
  systemPromptForNonRagOption: async () => "",
  geWebSearchFollowUpPrompt: async () => "{question}",
  promptForRag: async () => ({
    ragPrompt: "{context} {question}",
    ragQuestionPrompt: "{question}"
  })
}))
vi.mock("@/db/dexie/helpers", () => ({
  generateID: () => "bot-id",
  getPromptById: async () => null
}))
vi.mock("@/db/dexie/nickname", () => ({
  getModelNicknameByID: async () => null
}))
vi.mock("@/utils/generate-history", () => ({ generateHistory: async () => [] }))
vi.mock("@/utils/human-message", () => ({
  humanMessageFormatter: async ({ content }) => ({ content })
}))
vi.mock("@/libs/mcp/normal-chat", () => ({
  runMcpNormalChatMode: async () => false
}))
vi.mock("@/web/web", () => ({
  isQueryHaveWebsite: async () => false,
  getSystemPromptForWeb: async () => ({ prompt: "", source: [] })
}))

vi.mock("@/libs/get-tab-contents", () => ({
  getTabContents: async () => "page context"
}))

function chatState() {
  let messages: any[] = []
  let saved: any
  let history: any[] = []
  const params = {
    selectedModel: "test",
    useOCR: false,
    selectedSystemPrompt: "",
    currentChatModelSettings: {},
    setMessages: (next) => {
      messages = typeof next === "function" ? next(messages) : next
    },
    setHistory: (next) => {
      history = next
    },
    saveMessageOnSuccess: async (data) => {
      saved = data
      return "history"
    },
    saveMessageOnError: async () => null,
    setIsProcessing: () => {},
    setStreaming: () => {},
    setAbortController: () => {},
    setIsSearchingInternet: () => {},
    historyId: null,
    setHistoryId: () => {}
  }
  return {
    params,
    messages: () => messages,
    saved: () => saved,
    history: () => history
  }
}

describe("shared chat streaming parity", () => {
  it("tab chat leaves one user and one completed assistant message", async () => {
    const chat = chatState()
    await tabChatMode(
      "question",
      "",
      [],
      false,
      [],
      [],
      new AbortController().signal,
      chat.params
    )
    expect(
      chat.messages().map((message) => [message.isBot, message.message])
    ).toEqual([
      [false, "question"],
      [true, "response"]
    ])
  })
  it("sends and saves every attached image", async () => {
    const chat = chatState()
    const images = ["data:image/png;base64,one", "data:image/png;base64,two"]
    await normalChatMode(
      "question",
      images[0],
      false,
      [],
      [],
      new AbortController().signal,
      { ...chat.params, images }
    )
    expect(
      state.input
        .at(-1)
        .content.filter((part) => part.type === "image_url")
        .map((part) => part.image_url)
    ).toEqual(images)
    expect(chat.messages().find((message) => !message.isBot).images).toEqual(
      images
    )
    expect(chat.history()[0].images).toEqual(images)
    expect(chat.saved().images).toEqual(images)
  })
  it("web search leaves one user and one completed assistant message", async () => {
    const chat = chatState()
    await searchChatMode(
      "question",
      "",
      false,
      [],
      [],
      new AbortController().signal,
      chat.params
    )
    expect(
      chat.messages().map((message) => [message.isBot, message.message])
    ).toEqual([
      [false, "question"],
      [true, "response"]
    ])
  })
})
