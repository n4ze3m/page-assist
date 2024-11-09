import { Knowledge } from "@/db/knowledge"
import { create } from "zustand"

type WebSearch = {
  search_engine: string
  search_url: string
  search_query: string
  search_results: {
    title: string
    link: string
  }[]
}
export type Message = {
  isBot: boolean
  name: string
  message: string
  sources: any[]
  images?: string[]
  search?: WebSearch
  id?: string
  messageType?: string
}

export type ChatHistory = {
  role: "user" | "assistant" | "system"
  content: string
  image?: string,
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
  chatMode: "normal" | "rag"
  setChatMode: (chatMode: "normal" | "rag") => void
  isEmbedding: boolean
  setIsEmbedding: (isEmbedding: boolean) => void
  webSearch: boolean
  setWebSearch: (webSearch: boolean) => void
  isSearchingInternet: boolean
  setIsSearchingInternet: (isSearchingInternet: boolean) => void

  selectedSystemPrompt: string | null
  setSelectedSystemPrompt: (selectedSystemPrompt: string) => void

  selectedQuickPrompt: string | null
  setSelectedQuickPrompt: (selectedQuickPrompt: string) => void

  selectedKnowledge: Knowledge | null
  setSelectedKnowledge: (selectedKnowledge: Knowledge) => void

  setSpeechToTextLanguage: (language: string) => void
  speechToTextLanguage: string

  temporaryChat: boolean
  setTemporaryChat: (temporaryChat: boolean) => void
}

export const useStoreMessageOption = create<State>((set) => ({
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
  speechToTextLanguage: "en-US",
  setSpeechToTextLanguage: (language) =>
    set({ speechToTextLanguage: language }),
  selectedModel: null,
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  chatMode: "normal",
  setChatMode: (chatMode) => set({ chatMode }),
  isEmbedding: false,
  setIsEmbedding: (isEmbedding) => set({ isEmbedding }),
  webSearch: false,
  setWebSearch: (webSearch) => set({ webSearch }),
  isSearchingInternet: false,
  setIsSearchingInternet: (isSearchingInternet) => set({ isSearchingInternet }),
  selectedSystemPrompt: null,
  setSelectedSystemPrompt: (selectedSystemPrompt) =>
    set({ selectedSystemPrompt }),
  selectedQuickPrompt: null,
  setSelectedQuickPrompt: (selectedQuickPrompt) => set({ selectedQuickPrompt }),

  selectedKnowledge: null,
  setSelectedKnowledge: (selectedKnowledge) => set({ selectedKnowledge }),

  temporaryChat: false,
  setTemporaryChat: (temporaryChat) => set({ temporaryChat }),
}))
