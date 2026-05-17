import { generateID } from "@/db/dexie/helpers"
import type { HistoryInfo, Message } from "@/db/dexie/types"

/**
 * Open WebUI chat export format.
 *
 * The exported file is a top-level JSON array. Each entry wraps a single chat
 * in a `chat` object that holds both a linear `messages` array and a
 * `history.messages` map keyed by message id (with a `currentId` pointing at
 * the active leaf). We follow the `currentId` -> `parentId` chain so only the
 * active branch of a regenerated/edited conversation is imported.
 */
type OpenWebUIMessage = {
  id: string
  parentId: string | null
  childrenIds?: string[]
  role: string
  content: string
  model?: string
  modelName?: string
  timestamp?: number
}

type OpenWebUIChat = {
  id?: string
  title?: string
  models?: string[]
  history?: {
    messages?: Record<string, OpenWebUIMessage>
    currentId?: string | null
  }
  messages?: OpenWebUIMessage[]
}

type OpenWebUIChatWrapper = {
  id?: string
  title?: string
  chat?: OpenWebUIChat
  created_at?: number
  updated_at?: number
}

const HTML_ENTITIES: Record<string, string> = {
  "&gt;": ">",
  "&lt;": "<",
  "&amp;": "&",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&#x2F;": "/",
  "&nbsp;": " "
}

const unescapeHtml = (text: string): string =>
  text.replace(
    /&(?:gt|lt|amp|quot|nbsp|#x27|#39|#x2F);/g,
    (match) => HTML_ENTITIES[match] ?? match
  )

/**
 * Open WebUI wraps assistant reasoning in
 * `<details type="reasoning">...<summary>...</summary> body </details>` with
 * HTML-escaped content. Page Assist renders reasoning from `<think>` tags, so
 * we rewrite the block and unescape its body. Returns the converted content
 * plus the reasoning duration (seconds) when present.
 */
const convertReasoning = (
  content: string
): { content: string; reasoningSeconds?: number } => {
  if (!content) return { content: "" }

  const detailsRegex =
    /<details\s+type="reasoning"[^>]*>([\s\S]*?)<\/details>/i

  let reasoningSeconds: number | undefined

  const converted = content.replace(detailsRegex, (block, inner: string) => {
    const durationMatch = block.match(/duration="(\d+)"/i)
    if (durationMatch) {
      reasoningSeconds = parseInt(durationMatch[1], 10)
    }

    const body = inner
      .replace(/<summary>[\s\S]*?<\/summary>/i, "")
      .trim()

    if (!body) return ""

    return `<think>\n${unescapeHtml(body)}\n</think>\n\n`
  })

  return { content: converted.trim(), reasoningSeconds }
}

/**
 * Resolve the active conversation branch. Prefer walking `currentId` ->
 * `parentId` through the history map; fall back to the linear `messages`
 * array when the map is unavailable.
 */
const resolveMessagePath = (chat: OpenWebUIChat): OpenWebUIMessage[] => {
  const map = chat.history?.messages
  const currentId = chat.history?.currentId

  if (map && currentId && map[currentId]) {
    const path: OpenWebUIMessage[] = []
    let cursor: string | null | undefined = currentId
    const seen = new Set<string>()

    while (cursor && map[cursor] && !seen.has(cursor)) {
      seen.add(cursor)
      path.unshift(map[cursor])
      cursor = map[cursor].parentId
    }

    if (path.length > 0) return path
  }

  if (Array.isArray(chat.messages) && chat.messages.length > 0) {
    return chat.messages
  }

  if (map) {
    return Object.values(map).sort(
      (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
    )
  }

  return []
}

/**
 * Detect an Open WebUI chat export (a top-level array whose entries carry a
 * `chat` object with either a `history` map or a linear `messages` array).
 */
export const isOpenWebUIExport = (data: any): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false
  return data.some((entry) => {
    const chat = entry?.chat
    return (
      chat &&
      typeof chat === "object" &&
      (chat.history?.messages || Array.isArray(chat.messages))
    )
  })
}

/**
 * Convert an Open WebUI export into the Page Assist import shape
 * (`{ chat: [{ history, messages }] }`) so it flows through the existing
 * import pipeline.
 */
export const convertOpenWebUIToPageAssist = (
  data: OpenWebUIChatWrapper[]
): { chat: { history: HistoryInfo; messages: Message[] }[] } => {
  const chat: { history: HistoryInfo; messages: Message[] }[] = []

  for (const wrapper of data) {
    const owChat = wrapper?.chat
    if (!owChat) continue

    const path = resolveMessagePath(owChat)
    if (path.length === 0) continue

    const historyId = generateID()
    const createdAtSeconds =
      wrapper.created_at ?? path[0]?.timestamp ?? Math.floor(Date.now() / 1000)

    const title =
      wrapper.title?.trim() ||
      owChat.title?.trim() ||
      path.find((m) => m.role === "user")?.content?.slice(0, 50) ||
      "Imported Chat"

    const history: HistoryInfo = {
      id: historyId,
      title,
      is_rag: false,
      message_source: "web-ui",
      createdAt: createdAtSeconds * 1000,
      model_id: owChat.models?.[0]
    }

    const messages: Message[] = []

    path.forEach((m, index) => {
      if (m.role !== "user" && m.role !== "assistant") return

      const isAssistant = m.role === "assistant"
      const { content, reasoningSeconds } = isAssistant
        ? convertReasoning(m.content ?? "")
        : { content: m.content ?? "", reasoningSeconds: undefined }

      const modelId = m.model || m.modelName || ""

      messages.push({
        id: generateID(),
        history_id: historyId,
        name: isAssistant ? modelId : "",
        role: m.role,
        content,
        images: [],
        sources: [],
        createdAt: m.timestamp
          ? m.timestamp * 1000 + index
          : createdAtSeconds * 1000 + index,
        modelName: isAssistant ? m.modelName || modelId : undefined,
        reasoning_time_taken: reasoningSeconds
      })
    })

    if (messages.length === 0) continue

    chat.push({ history, messages })
  }

  return { chat }
}
