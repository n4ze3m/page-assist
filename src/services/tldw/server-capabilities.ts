import { tldwClient } from "./TldwApiClient"

export type ServerCapabilities = {
  hasChat: boolean
  hasRag: boolean
  hasMedia: boolean
  hasNotes: boolean
  hasPrompts: boolean
  hasFlashcards: boolean
  hasCharacters: boolean
  hasWorldBooks: boolean
  hasChatDictionaries: boolean
  hasAudio: boolean
  hasEmbeddings: boolean
  hasMetrics: boolean
  hasMcp: boolean
  hasReading: boolean
  specVersion: string | null
}

const defaultCapabilities: ServerCapabilities = {
  hasChat: false,
  hasRag: false,
  hasMedia: false,
  hasNotes: false,
  hasPrompts: false,
  hasFlashcards: false,
  hasCharacters: false,
  hasWorldBooks: false,
  hasChatDictionaries: false,
  hasAudio: false,
  hasEmbeddings: false,
  hasMetrics: false,
  hasMcp: false,
  hasReading: false,
  specVersion: null
}

const fallbackSpec = {
  info: { version: "local-fallback" },
  paths: Object.fromEntries(
    [
      "/api/v1/chat/completions",
      "/api/v1/rag/search",
      "/api/v1/rag/health",
      "/api/v1/rag/",
      "/api/v1/media/add",
      "/api/v1/media/",
      "/api/v1/media/process-videos",
      "/api/v1/media/process-documents",
      "/api/v1/media/process-pdfs",
      "/api/v1/media/process-ebooks",
      "/api/v1/media/process-audios",
      "/api/v1/notes/",
      "/api/v1/prompts",
      "/api/v1/flashcards",
      "/api/v1/flashcards/decks",
      "/api/v1/characters",
      "/api/v1/characters/world-books",
      "/api/v1/chat/dictionaries",
      "/api/v1/audio/transcriptions",
      "/api/v1/audio/speech",
      "/api/v1/audio/health",
      "/api/v1/embeddings/models",
      "/api/v1/embeddings/providers-config",
      "/api/v1/embeddings/health",
      "/api/v1/metrics/health",
      "/api/v1/metrics",
      "/api/v1/mcp/health",
      "/api/v1/reading/save",
      "/api/v1/reading/items"
    ].map((p) => [p, {}])
  )
}

const normalizePaths = (raw: any): Record<string, any> => {
  const out: Record<string, any> = {}
  if (!raw || typeof raw !== "object") return out
  for (const key of Object.keys(raw)) {
    const k = key.trim()
    out[k] = raw[key]
    if (k.endsWith("/")) {
      out[k.slice(0, -1)] = raw[key]
    } else {
      out[`${k}/`] = raw[key]
    }
  }
  return out
}

const computeCapabilities = (spec: any | null | undefined): ServerCapabilities => {
  if (!spec || typeof spec !== "object") return { ...defaultCapabilities }
  const paths = normalizePaths(spec.paths || {})
  const has = (p: string) => Boolean(paths[p])

  return {
    hasChat: has("/api/v1/chat/completions"),
    hasRag: has("/api/v1/rag/search") || has("/api/v1/rag/health") || has("/api/v1/rag/"),
    hasMedia:
      has("/api/v1/media/add") ||
      has("/api/v1/media/") ||
      has("/api/v1/media/process-videos") ||
      has("/api/v1/media/process-documents"),
    hasNotes: has("/api/v1/notes/"),
    hasPrompts: has("/api/v1/prompts") || has("/api/v1/prompts/"),
    hasFlashcards:
      has("/api/v1/flashcards") ||
      has("/api/v1/flashcards/") ||
      has("/api/v1/flashcards/decks"),
    hasCharacters: has("/api/v1/characters") || has("/api/v1/characters/"),
    hasWorldBooks: has("/api/v1/characters/world-books"),
    hasChatDictionaries: has("/api/v1/chat/dictionaries"),
    hasAudio:
      has("/api/v1/audio/speech") ||
      has("/api/v1/audio/transcriptions") ||
      has("/api/v1/audio/health"),
    hasEmbeddings:
      has("/api/v1/embeddings/models") ||
      has("/api/v1/embeddings/providers-config") ||
      has("/api/v1/embeddings/health"),
    hasMetrics: has("/api/v1/metrics/health") || has("/api/v1/metrics"),
    hasMcp: has("/api/v1/mcp/health"),
    hasReading: has("/api/v1/reading/save") && has("/api/v1/reading/items"),
    specVersion: spec?.info?.version ?? null
  }
}

let capabilitiesPromise: Promise<ServerCapabilities> | null = null

export const getServerCapabilities = async (): Promise<ServerCapabilities> => {
  if (!capabilitiesPromise) {
    capabilitiesPromise = (async () => {
      let spec: any | null = null
      try {
        const healthy = await tldwClient.healthCheck()
        if (healthy) {
          spec = await tldwClient.getOpenAPISpec()
        }
      } catch {
        // ignore, fall back to bundled spec
      }
      if (!spec) {
        spec = fallbackSpec
      }
      return computeCapabilities(spec)
    })()
  }
  return capabilitiesPromise
}
