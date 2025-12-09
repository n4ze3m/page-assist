import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useServerOnline } from "@/hooks/useServerOnline"
import { useAntdMessage } from "@/hooks/useAntdMessage"
import { useMessageOption } from "~/hooks/useMessageOption"
import { useStoreChatModelSettings } from "@/store/model"
import { PageAssistDatabase } from "@/db/dexie/chat"
import {
  formatToChatHistory,
  formatToMessage,
  getAllPrompts,
  getPromptById,
  getSessionFiles
} from "@/db/dexie/helpers"
import { lastUsedChatModelEnabled } from "@/services/model-settings"
import { bgRequest } from "@/services/background-proxy"
import type { AllowedPath } from "@/services/tldw/openapi-guard"
import { listDecks, type Deck, createDeck } from "@/services/flashcards"
import { updatePageTitle } from "@/utils/update-page-title"
import type {
  ChatSummary,
  FlashcardCollectionSummary,
  MediaItemSummary,
  NoteSummary,
  OmniSearchDependencies,
  OmniSearchQuery,
  PromptSummary,
  ScreenDefinition
} from "@/utils/omni-search"

type ScreenConfig = {
  id: string
  route: string
  labelKey: string
  defaultLabel: string
  description?: string
  keywords?: string[]
  icon: string
}

const BASE_SCREEN_CONFIGS: ScreenConfig[] = [
  {
    id: "chat",
    route: "/",
    labelKey: "option:header.modePlayground",
    defaultLabel: "Chat",
    description: "Main chat workspace",
    keywords: ["chat", "playground", "conversation"],
    icon: "chat"
  },
  {
    id: "media",
    route: "/media",
    labelKey: "option:header.media",
    defaultLabel: "Media",
    description: "Search and inspect processed media",
    keywords: ["media", "video", "audio", "documents"],
    icon: "media"
  },
  {
    id: "media-multi",
    route: "/media-multi",
    labelKey: "option:header.libraryView",
    defaultLabel: "Multi-Item Review",
    description: "Compare multiple media items side by side",
    keywords: ["review", "multi", "compare"],
    icon: "media"
  },
  {
    id: "flashcards",
    route: "/flashcards",
    labelKey: "option:header.flashcards",
    defaultLabel: "Flashcards",
    description: "Review and manage spaced-repetition cards",
    keywords: ["flashcards", "cards", "review", "study"],
    icon: "flashcards"
  },
  {
    id: "notes",
    route: "/notes",
    labelKey: "option:header.notes",
    defaultLabel: "Notes",
    description: "Create and search rich notes",
    keywords: ["notes", "notebook"],
    icon: "note"
  },
  {
    id: "knowledge",
    route: "/knowledge",
    labelKey: "option:header.modeKnowledge",
    defaultLabel: "Knowledge QA",
    description: "Ask questions over ingested knowledge",
    keywords: ["knowledge", "rag", "qa"],
    icon: "knowledge"
  },
  {
    id: "prompts",
    route: "/prompts",
    labelKey: "option:header.modePromptsPlayground",
    defaultLabel: "Prompts",
    description: "Browse and manage reusable prompts",
    keywords: ["prompt", "templates"],
    icon: "prompt"
  },
  {
    id: "prompt-studio",
    route: "/prompt-studio",
    labelKey: "option:header.modePromptStudio",
    defaultLabel: "Prompt Studio",
    description: "Advanced prompt engineering workspace",
    keywords: ["prompt studio", "experiments"],
    icon: "prompt"
  },
  {
    id: "world-books",
    route: "/world-books",
    labelKey: "option:header.modeWorldBooks",
    defaultLabel: "World Books",
    description: "Structured world knowledge for characters",
    keywords: ["world books", "knowledge"],
    icon: "knowledge"
  },
  {
    id: "dictionaries",
    route: "/dictionaries",
    labelKey: "option:header.modeDictionaries",
    defaultLabel: "Chat dictionaries",
    description: "Reusable dictionaries for chat",
    keywords: ["dictionary", "dictionaries"],
    icon: "knowledge"
  },
  {
    id: "characters",
    route: "/characters",
    labelKey: "option:header.modeCharacters",
    defaultLabel: "Characters",
    description: "Chat with configured characters",
    keywords: ["character", "persona"],
    icon: "chat"
  },
  {
    id: "evaluations",
    route: "/evaluations",
    labelKey: "option:header.evaluations",
    defaultLabel: "Evaluations",
    description: "Model and prompt evaluations",
    keywords: ["evaluation", "evals"],
    icon: "workspace"
  },
  {
    id: "tts",
    route: "/tts",
    labelKey: "option:tts.playground",
    defaultLabel: "TTS Playground",
    description: "Text-to-speech playground",
    keywords: ["tts", "audio", "speech"],
    icon: "tts"
  },
  {
    id: "settings-tldw",
    route: "/settings/tldw",
    labelKey: "settings:tldw.serverNav",
    defaultLabel: "tldw server",
    description: "Server URL and auth settings",
    keywords: ["settings", "server", "connection"],
    icon: "settings"
  },
  {
    id: "settings-general",
    route: "/settings",
    labelKey: "settings:generalSettings.title",
    defaultLabel: "General settings",
    description: "Global extension configuration",
    keywords: ["settings", "general", "options"],
    icon: "settings"
  },
  {
    id: "settings-knowledge",
    route: "/settings/knowledge",
    labelKey: "settings:manageKnowledge.title",
    defaultLabel: "Knowledge settings",
    description: "Manage knowledge bases",
    keywords: ["settings", "knowledge", "rag"],
    icon: "settings"
  },
  {
    id: "settings-prompts",
    route: "/settings/prompt",
    labelKey: "settings:managePrompts.title",
    defaultLabel: "Prompt settings",
    description: "Manage prompt library",
    keywords: ["settings", "prompt"],
    icon: "settings"
  },
  {
    id: "settings-share",
    route: "/settings/share",
    labelKey: "settings:manageShare.title",
    defaultLabel: "Share settings",
    description: "Configure sharing and links",
    keywords: ["settings", "share"],
    icon: "settings"
  },
  {
    id: "settings-about",
    route: "/settings/about",
    labelKey: "settings:about.title",
    defaultLabel: "About",
    description: "About this extension",
    keywords: ["about", "version"],
    icon: "settings"
  }
]

const truncate = (value: string | undefined | null, max: number): string => {
  if (!value) return ""
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

export const useOmniSearchDeps = (): OmniSearchDependencies => {
  const { t } = useTranslation(["option", "common", "settings"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const message = useAntdMessage()
  const {
    setHistory,
    setMessages,
    setHistoryId,
    setSelectedModel,
    setSelectedSystemPrompt,
    setContextFiles,
    setServerChatId,
    clearChat
  } = useMessageOption()
  const chatModelSettings = useStoreChatModelSettings()

  const screens: ScreenDefinition[] = React.useMemo(
    () =>
      BASE_SCREEN_CONFIGS.map((cfg) => ({
        id: cfg.id,
        label: t(cfg.labelKey as any, cfg.defaultLabel),
        description: cfg.description,
        icon: cfg.icon,
        route: cfg.route,
        keywords: cfg.keywords
      })),
    [t]
  )

  const searchScreens = React.useCallback(
    async (query: OmniSearchQuery): Promise<ScreenDefinition[]> => {
      const q = query.normalized.trim()
      if (!q) return []
      const lower = q.toLowerCase()

      const scored = screens
        .map((screen) => {
          const label = screen.label.toLowerCase()
          const keywords = (screen.keywords || []).map((k) => k.toLowerCase())
          let score = 0
          if (label === lower) score += 3
          else if (label.startsWith(lower)) score += 2
          else if (label.includes(lower)) score += 1

          if (keywords.some((k) => k.includes(lower))) score += 0.5

          return { screen, score }
        })
        .filter((entry) => entry.score > 0)

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.screen.label.localeCompare(b.screen.label)
      })

      return scored.map((entry) => entry.screen)
    },
    [screens]
  )

  const searchChats = React.useCallback(
    async (query: OmniSearchQuery): Promise<ChatSummary[]> => {
      const q = query.normalized.trim()
      if (!q) return []
      try {
        const db = new PageAssistDatabase()
        const histories = await db.fullTextSearchChatHistories(q)
        return histories.map((h) => ({
          id: h.id,
          title: h.title || "Untitled Chat",
          lastMessageSnippet: undefined,
          lastUpdatedAt: h.createdAt
            ? new Date(h.createdAt).toISOString()
            : undefined
        }))
      } catch {
        return []
      }
    },
    []
  )

  const searchMedia = React.useCallback(
    async (query: OmniSearchQuery): Promise<MediaItemSummary[]> => {
      const q = query.normalized.trim()
      if (!q || !isOnline) return []
      try {
        const body: any = {
          query: q,
          fields: ["title", "content"],
          sort_by: "relevance"
        }
        const res = await bgRequest<any, AllowedPath, "POST">({
          path: "/api/v1/media/search" as AllowedPath,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        })
        const items = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.results)
            ? res.results
            : []
        return items.map((m: any) => ({
          id: String(m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid),
          title: m?.title || m?.filename || `Media ${m?.id ?? ""}`,
          source: String(m?.type || m?.media_type || "").toLowerCase() || undefined,
          createdAt: m?.created_at
        }))
      } catch {
        return []
      }
    },
    [isOnline]
  )

  const searchNotes = React.useCallback(
    async (query: OmniSearchQuery): Promise<NoteSummary[]> => {
      const q = query.normalized.trim()
      if (!q || !isOnline) return []
      try {
        const res = await bgRequest<any, AllowedPath, "GET">({
          path: `/api/v1/notes/search/?query=${encodeURIComponent(q)}` as AllowedPath,
          method: "GET"
        })
        const items = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
            ? res
            : []
        return items.map((n: any) => ({
          id: String(n?.id),
          title: n?.title || "Untitled note",
          snippet: truncate(String(n?.content || ""), 120),
          updatedAt: n?.updated_at
        }))
      } catch {
        return []
      }
    },
    [isOnline]
  )

  const searchFlashcards = React.useCallback(
    async (query: OmniSearchQuery): Promise<FlashcardCollectionSummary[]> => {
      const q = query.normalized.trim()
      if (!q || !isOnline) return []
      try {
        const decks: Deck[] = await listDecks()
        const lower = q.toLowerCase()
        const matches = decks.filter((deck) => {
          const name = String(deck.name || "").toLowerCase()
          const desc = String(deck.description || "").toLowerCase()
          return name.includes(lower) || desc.includes(lower)
        })
        matches.sort((a, b) => {
          const aName = String(a.name || "").toLowerCase()
          const bName = String(b.name || "").toLowerCase()
          return aName.localeCompare(bName)
        })
        return matches.map((deck) => ({
          id: String(deck.id),
          name: deck.name || "Untitled deck",
          cardCount: undefined,
          lastReviewedAt: deck.last_modified || deck.created_at || undefined
        }))
      } catch {
        return []
      }
    },
    [isOnline]
  )

  const searchPrompts = React.useCallback(
    async (query: OmniSearchQuery): Promise<PromptSummary[]> => {
      const q = query.normalized.trim()
      if (!q) return []
      try {
        const lower = q.toLowerCase()
        const prompts = await getAllPrompts()
        const scored = prompts
          .map((p) => {
            const title = String(p.title || p.name || "").toLowerCase()
            const content = String(
              p.content || p.system_prompt || p.user_prompt || ""
            ).toLowerCase()
            const keywords = (p.keywords || p.tags || []).map((k) =>
              String(k).toLowerCase()
            )
            let score = 0
            if (title === lower) score += 3
            else if (title.startsWith(lower)) score += 2
            else if (title.includes(lower)) score += 1
            if (content.includes(lower)) score += 0.5
            if (keywords.some((k) => k.includes(lower))) score += 0.5
            return { prompt: p, score }
          })
          .filter((entry) => entry.score > 0)

        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          const aTitle = String(a.prompt.title || a.prompt.name || "").toLowerCase()
          const bTitle = String(b.prompt.title || b.prompt.name || "").toLowerCase()
          return aTitle.localeCompare(bTitle)
        })

        return scored.map(({ prompt }) => ({
          id: prompt.id,
          name: prompt.title || prompt.name || "Untitled prompt",
          snippet: truncate(
            String(
              prompt.content ||
                prompt.system_prompt ||
                prompt.user_prompt ||
                ""
            ),
            120
          ),
          lastUsedAt: undefined
        }))
      } catch {
        return []
      }
    },
    []
  )

  const navigateToScreen = React.useCallback(
    (screenId: string) => {
      const target = BASE_SCREEN_CONFIGS.find((cfg) => cfg.id === screenId)
      if (!target) return
      navigate(target.route)
    },
    [navigate]
  )

  const openChat = React.useCallback(
    (chatId: string) => {
      void (async () => {
        try {
          const db = new PageAssistDatabase()
          const history = await db.getChatHistory(chatId)
          const historyDetails = await db.getHistoryInfo(chatId)

          setServerChatId(null)
          setHistoryId(chatId)
          setHistory(formatToChatHistory(history))
          setMessages(formatToMessage(history))

          const useLastModel = await lastUsedChatModelEnabled()
          if (useLastModel) {
            const currentChatModel = historyDetails?.model_id
            if (currentChatModel) {
              setSelectedModel(currentChatModel)
            }
          }

          const lastUsedPrompt = historyDetails?.last_used_prompt
          if (lastUsedPrompt) {
            if (lastUsedPrompt.prompt_id) {
              const prompt = await getPromptById(lastUsedPrompt.prompt_id)
              if (prompt) {
                setSelectedSystemPrompt(lastUsedPrompt.prompt_id)
              }
            }
            if (lastUsedPrompt.prompt_content) {
              chatModelSettings.setSystemPrompt(lastUsedPrompt.prompt_content)
            }
          }

          const sessionFiles = await getSessionFiles(chatId)
          setContextFiles(sessionFiles)

          updatePageTitle(historyDetails?.title || "Untitled Chat")
          navigate("/")
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Failed to open chat from omni-search", e)
        }
      })()
    },
    [
      chatModelSettings,
      navigate,
      setContextFiles,
      setHistory,
      setHistoryId,
      setMessages,
      setSelectedModel,
      setSelectedSystemPrompt,
      setServerChatId
    ]
  )

  const openMediaItem = React.useCallback(
    (mediaId: string) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tldw:lastMediaId", String(mediaId))
        }
      } catch {
        // ignore storage errors
      }
      navigate("/media-multi")
    },
    [navigate]
  )

  const openNote = React.useCallback(
    (noteId: string) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tldw:lastNoteId", String(noteId))
        }
      } catch {
        // ignore storage errors
      }
      navigate("/notes")
    },
    [navigate]
  )

  const openFlashcardCollection = React.useCallback(
    (collectionId: string) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tldw:lastDeckId", String(collectionId))
        }
      } catch {
        // ignore storage errors
      }
      navigate("/flashcards")
    },
    [navigate]
  )

  const openPrompt = React.useCallback(
    (_promptId: string) => {
      // v1: jump to Prompts workspace; selection can be refined later.
      navigate("/prompts")
    },
    [navigate]
  )

  const createNoteFromOmni = React.useCallback(
    async (title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      try {
        await bgRequest<any, AllowedPath, "POST">({
          path: "/api/v1/notes/" as AllowedPath,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            title: trimmed,
            content: ""
          }
        })
        message.success(
          t("option:header.omniSearchCreateNoteSuccess", {
            defaultValue: 'Note "{{query}}" created',
            query: trimmed
          })
        )
      } catch (e: any) {
        message.error(e?.message || "Failed to create note")
      } finally {
        navigate("/notes")
      }
    },
    [message, navigate, t]
  )

  const createFlashcardCollectionFromOmni = React.useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      try {
        await createDeck({ name: trimmed, description: null })
        message.success(
          t("option:header.omniSearchCreateFlashcardsSuccess", {
            defaultValue: 'Flashcard collection "{{query}}" created',
            query: trimmed
          })
        )
      } catch (e: any) {
        message.error(e?.message || "Failed to create flashcard collection")
      } finally {
        navigate("/flashcards")
      }
    },
    [message, navigate, t]
  )

  const startNewChatFromOmni = React.useCallback(
    (title: string) => {
      const trimmed = title.trim()
      clearChat()
      if (trimmed) {
        updatePageTitle(trimmed)
      }
      navigate("/")
    },
    [clearChat, navigate, updatePageTitle]
  )

  const deps: OmniSearchDependencies = React.useMemo(
    () => ({
      searchScreens,
      searchChats,
      searchMedia,
      searchNotes,
      searchFlashcards,
      searchPrompts,
      navigateToScreen,
      openChat,
      openMediaItem,
      openNote,
      openFlashcardCollection,
      openPrompt,
      createNoteFromOmni,
      createFlashcardCollectionFromOmni,
      startNewChatFromOmni
    }),
    [
      openChat,
      openFlashcardCollection,
      openMediaItem,
      openNote,
      openPrompt,
      navigateToScreen,
      searchChats,
      searchFlashcards,
      searchMedia,
      searchNotes,
      searchPrompts,
      searchScreens,
      createNoteFromOmni,
      createFlashcardCollectionFromOmni,
      startNewChatFromOmni
    ]
  )

  return deps
}
