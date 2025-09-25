import { bgRequest } from "@/services/background-proxy"
import { Storage } from "@plasmohq/storage"
import type { AllowedPath } from "@/services/tldw/openapi-guard"

// Minimal client types based on openapi.json
export type Deck = {
  id: number
  name: string
  description?: string | null
  deleted: boolean
  client_id: string
  version: number
  created_at?: string | null
  last_modified?: string | null
}

export type Flashcard = {
  uuid: string
  deck_id?: number | null
  front: string
  back: string
  notes?: string | null
  extra?: string | null
  is_cloze: boolean
  tags?: string[] | null
  ef: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at?: string | null
  last_reviewed_at?: string | null
  last_modified?: string | null
  deleted: boolean
  client_id: string
  version: number
  model_type: "basic" | "basic_reverse" | "cloze"
  reverse: boolean
}

export type FlashcardCreate = {
  deck_id?: number | null
  front: string
  back: string
  notes?: string | null
  extra?: string | null
  is_cloze?: boolean | null
  tags?: string[] | null
  source_ref_type?: "media" | "message" | "note" | "manual" | null
  source_ref_id?: string | null
  model_type?: Flashcard["model_type"] | null
  reverse?: boolean | null
}

export type FlashcardUpdate = {
  deck_id?: number | null
  front?: string | null
  back?: string | null
  notes?: string | null
  extra?: string | null
  is_cloze?: boolean | null
  tags?: string[] | null
  expected_version?: number | null
  model_type?: Flashcard["model_type"] | null
  reverse?: boolean | null
}

export type FlashcardListResponse = {
  items: Flashcard[]
  count: number
}

export type FlashcardReviewRequest = {
  card_uuid: string
  rating: number // 0-5
  answer_time_ms?: number | null
}

export type FlashcardReviewResponse = {
  uuid: string
  ef: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at?: string | null
  last_reviewed_at?: string | null
  last_modified?: string | null
  version: number
}

export type FlashcardsImportRequest = {
  content: string
  delimiter?: string | null
  has_header?: boolean | null
}

export type FlashcardsExportParams = {
  deck_id?: number | null
  tag?: string | null
  q?: string | null
  format?: "csv" | "apkg" | null
  include_reverse?: boolean | null
  delimiter?: string | null
  include_header?: boolean | null
  extended_header?: boolean | null
}

// Decks
export async function listDecks(): Promise<Deck[]> {
  return await bgRequest<Deck[], AllowedPath, "GET">({
    path: "/api/v1/flashcards/decks",
    method: "GET"
  })
}

export async function createDeck(input: { name: string; description?: string | null }): Promise<Deck> {
  return await bgRequest<Deck, AllowedPath, "POST">({
    path: "/api/v1/flashcards/decks",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: input
  })
}

// Flashcards CRUD
export async function listFlashcards(params: {
  deck_id?: number | null
  tag?: string | null
  due_status?: "new" | "learning" | "due" | "all" | null
  q?: string | null
  limit?: number
  offset?: number
  order_by?: "due_at" | "created_at" | null
}): Promise<FlashcardListResponse> {
  const search = new URLSearchParams()
  if (params.deck_id !== undefined && params.deck_id !== null) search.set("deck_id", String(params.deck_id))
  if (params.tag) search.set("tag", params.tag)
  if (params.due_status) search.set("due_status", params.due_status)
  if (params.q) search.set("q", params.q)
  if (typeof params.limit === "number") search.set("limit", String(params.limit))
  if (typeof params.offset === "number") search.set("offset", String(params.offset))
  if (params.order_by) search.set("order_by", params.order_by)
  const qs = search.toString()
  const path = `/api/v1/flashcards${qs ? `?${qs}` : ""}` as AllowedPath
  return await bgRequest<FlashcardListResponse, AllowedPath, "GET">({ path, method: "GET" })
}

export async function createFlashcard(input: FlashcardCreate): Promise<Flashcard> {
  return await bgRequest<Flashcard, AllowedPath, "POST">({
    path: "/api/v1/flashcards",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: input
  })
}

export async function getFlashcard(card_uuid: string): Promise<Flashcard> {
  return await bgRequest<Flashcard, AllowedPath, "GET">({
    path: `/api/v1/flashcards/${encodeURIComponent(card_uuid)}` as AllowedPath,
    method: "GET"
  })
}

export async function updateFlashcard(card_uuid: string, input: FlashcardUpdate): Promise<void> {
  await bgRequest<void, AllowedPath, "PATCH">({
    path: `/api/v1/flashcards/${encodeURIComponent(card_uuid)}` as AllowedPath,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: input
  })
}

export async function deleteFlashcard(card_uuid: string, expected_version: number): Promise<void> {
  await bgRequest<void, AllowedPath, "DELETE">({
    path: `/api/v1/flashcards/${encodeURIComponent(card_uuid)}?expected_version=${expected_version}` as AllowedPath,
    method: "DELETE"
  })
}

// Review
export async function reviewFlashcard(input: FlashcardReviewRequest): Promise<FlashcardReviewResponse> {
  return await bgRequest<FlashcardReviewResponse, AllowedPath, "POST">({
    path: "/api/v1/flashcards/review",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: input
  })
}

// Import
export async function getFlashcardsImportLimits(): Promise<any> {
  return await bgRequest<any, AllowedPath, "GET">({
    path: "/api/v1/config/flashcards-import-limits",
    method: "GET"
  })
}

export async function importFlashcards(payload: FlashcardsImportRequest, overrides?: {
  max_lines?: number | null
  max_line_length?: number | null
  max_field_length?: number | null
}): Promise<any> {
  const search = new URLSearchParams()
  if (overrides?.max_lines != null) search.set("max_lines", String(overrides.max_lines))
  if (overrides?.max_line_length != null) search.set("max_line_length", String(overrides.max_line_length))
  if (overrides?.max_field_length != null) search.set("max_field_length", String(overrides.max_field_length))
  const qs = search.toString()
  const path = `/api/v1/flashcards/import${qs ? `?${qs}` : ""}` as AllowedPath
  return await bgRequest<any, AllowedPath, "POST">({
    path,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload
  })
}

// Export (returns text/csv or file-like payload)
export async function exportFlashcards(params: FlashcardsExportParams = {}): Promise<string> {
  const search = new URLSearchParams()
  if (params.deck_id != null) search.set("deck_id", String(params.deck_id))
  if (params.tag) search.set("tag", params.tag)
  if (params.q) search.set("q", params.q)
  if (params.format) search.set("format", params.format)
  if (params.include_reverse != null) search.set("include_reverse", String(params.include_reverse))
  if (params.delimiter) search.set("delimiter", params.delimiter)
  if (params.include_header != null) search.set("include_header", String(params.include_header))
  if (params.extended_header != null) search.set("extended_header", String(params.extended_header))
  const qs = search.toString()
  const path = `/api/v1/flashcards/export${qs ? `?${qs}` : ""}` as AllowedPath
  // Force accept text so bgRequest returns text
  return await bgRequest<string, AllowedPath, "GET">({
    path,
    method: "GET",
    headers: { Accept: "text/plain, text/csv, application/octet-stream, application/json;q=0.5" }
  })
}

// Export binary (APKG). Uses direct fetch to preserve binary payload.
export async function exportFlashcardsFile(params: FlashcardsExportParams & { format: 'apkg' }): Promise<Blob> {
  const storage = new Storage({ area: 'local' })
  const cfg = await storage.get<any>('tldwConfig').catch(() => null)
  const base = (cfg?.serverUrl || '').replace(/\/$/, '')
  if (!base) throw new Error('Server not configured')
  const search = new URLSearchParams()
  if (params.deck_id != null) search.set("deck_id", String(params.deck_id))
  if (params.tag) search.set("tag", params.tag)
  if (params.q) search.set("q", params.q)
  search.set("format", "apkg")
  if (params.include_reverse != null) search.set("include_reverse", String(params.include_reverse))
  // CSV specific options ignored for apkg on server side, but safe to pass
  if (params.delimiter) search.set("delimiter", params.delimiter)
  if (params.include_header != null) search.set("include_header", String(params.include_header))
  if (params.extended_header != null) search.set("extended_header", String(params.extended_header))
  const url = `${base}/api/v1/flashcards/export?${search.toString()}`

  const headers: Record<string, string> = { Accept: 'application/octet-stream' }
  // Auth
  if (cfg?.authMode === 'single-user' && cfg?.apiKey) headers['X-API-KEY'] = String(cfg.apiKey)
  else if (cfg?.authMode === 'multi-user' && cfg?.accessToken) headers['Authorization'] = `Bearer ${cfg.accessToken}`

  const res = await fetch(url, { method: 'GET', headers, credentials: 'include' })
  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = j?.detail || j?.error || j?.message || msg } catch {}
    throw new Error(msg || `Export failed: ${res.status}`)
  }
  return await res.blob()
}
