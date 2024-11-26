import { create } from "zustand"

export type Message = {
  isBot: boolean
  name: string
  message: string
  sources: any[]
  images?: string[]
}

export type ChatHistory = {
  role: "user" | "assistant" | "system"
  content: string
  image?: string
  messageType?: string
}[]

type State = {
  messages: Message[]
  setMessages: (messages: Message[]) => void
  history: ChatHistory
  setHistory: (history: ChatHistory) => void
  streaming: boolean
  setStreaming: (streaming: boolean) => void
  isFirstMessage: boolean
  setIsFirstMessage: (isFirstMessage: boolean) => void
  historyId: string | null
  setHistoryId: (history_id: string | null) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
  selectedModel: string | null
  setSelectedModel: (selectedModel: string) => void
  chatMode: "normal" | "rag" | "vision"
  setChatMode: (chatMode: "normal" | "rag" | "vision") => void
  isEmbedding: boolean
  setIsEmbedding: (isEmbedding: boolean) => void
  speechToTextLanguage: string
  setSpeechToTextLanguage: (speechToTextLanguage: string) => void
  currentURL: string
  setCurrentURL: (currentURL: string) => void
  selectedSystemPrompt: string | null
  setSelectedSystemPrompt: (selectedSystemPrompt: string) => void

  selectedQuickPrompt: string | null
  setSelectedQuickPrompt: (selectedQuickPrompt: string) => void
}

export const useStoreMessage = create<State>((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  history: [],
  setHistory: (history) => set({ history }),
  streaming: false,
  setStreaming: (streaming) => set({ streaming }),
  isFirstMessage: true,
  setIsFirstMessage: (isFirstMessage) => set({ isFirstMessage }),
  historyId: null,
  setHistoryId: (historyId) => set({ historyId }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  defaultSpeechToTextLanguage: "en-US",
  selectedModel: null,
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  chatMode: "normal",
  setChatMode: (chatMode) => set({ chatMode }),
  isEmbedding: false,
  setIsEmbedding: (isEmbedding) => set({ isEmbedding }),
  speechToTextLanguage: "en-US",
  setSpeechToTextLanguage: (speechToTextLanguage) =>
    set({ speechToTextLanguage }),
  currentURL: "",
  setCurrentURL: (currentURL) => set({ currentURL }),

  selectedSystemPrompt: null,
  setSelectedSystemPrompt: (selectedSystemPrompt) =>
    set({ selectedSystemPrompt }),
  selectedQuickPrompt: null,
  setSelectedQuickPrompt: (selectedQuickPrompt) => set({ selectedQuickPrompt })
}))
