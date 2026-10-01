import { generateID } from "@/db/dexie/helpers"
import type { HistoryInfo, Message } from "@/db/dexie/types"

/**
 * Dynamic / generic chat import.
 *
 * Unlike the Page Assist and Open WebUI importers, this one does not assume a
 * single fixed schema. It walks an arbitrary JSON export from a third-party
 * service and tries to discover conversations and messages using the field
 * names that chat tools commonly use (`messages`, `role`, `content`, ChatGPT's
 * `mapping` tree, etc.).
 *
 * When a source carries no model information, the caller can supply a
 * `defaultModelId` (chosen by the user from their own model list) that is
 * applied to every imported conversation.
 */

export type DynamicMessage = {
  role: "user" | "assistant"
  content: string
  createdAt?: number
  modelName?: string
}

export type DynamicConversation = {
  title: string
  createdAt?: number
  modelId?: string
  messages: DynamicMessage[]
}

export type DynamicAnalysis = {
  conversations: DynamicConversation[]
  conversationCount: number
  messageCount: number
  /** Whether any conversation/message carried a model id we could detect. */
  hasModel: boolean
}

// Keys that commonly hold the list of conversations in an export.
const CONVERSATION_LIST_KEYS = [
  "conversations",
  "chats",
  "chat",
  "sessions",
  "threads",
  "history",
  "data",
  "items"
]

// Keys that commonly hold the list of messages within a conversation.
const MESSAGE_LIST_KEYS = [
  "messages",
  "message",
  "turns",
  "conversation",
  "chat",
  "history",
  "log",
  "dialog",
  "dialogue"
]

// Keys that commonly hold a model identifier.
const MODEL_KEYS = [
  "model",
  "model_id",
  "modelId",
  "model_slug",
  "modelSlug",
  "default_model_slug",
  "modelName",
  "model_name"
]

// Keys that commonly hold a role / author.
const ROLE_KEYS = ["role", "sender", "from", "author", "type", "speaker"]

// Keys that commonly hold textual content.
const CONTENT_KEYS = [
  "content",
  "text",
  "message",
  "value",
  "body",
  "parts",
  "data"
]

// Keys that commonly hold a timestamp.
const TIME_KEYS = [
  "create_time",
  "created_at",
  "createdAt",
  "timestamp",
  "time",
  "date",
  "updated_at",
  "updatedAt"
]

// Keys that commonly hold a conversation title.
const TITLE_KEYS = ["title", "name", "subject", "topic"]

const isObject = (v: any): v is Record<string, any> =>
  v != null && typeof v === "object" && !Array.isArray(v)

const firstString = (...vals: any[]): string | undefined => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  return undefined
}

/** Normalise a wide range of role labels into Page Assist's user/assistant. */
const normaliseRole = (raw: any): "user" | "assistant" | null => {
  if (isObject(raw) && typeof raw.role === "string") raw = raw.role
  if (typeof raw !== "string") return null
  const r = raw.trim().toLowerCase()
  if (["user", "human", "you", "me", "prompt", "input"].includes(r)) {
    return "user"
  }
  if (
    [
      "assistant",
      "ai",
      "bot",
      "gpt",
      "model",
      "llm",
      "system",
      "response",
      "output",
      "answer"
    ].includes(r)
  ) {
    // Treat system as assistant-ish so it is not silently dropped; callers can
    // still filter. Most exports won't include system turns.
    return r === "system" ? null : "assistant"
  }
  return null
}

/** Convert any reasonable timestamp representation into milliseconds. */
const normaliseTime = (raw: any): number | undefined => {
  if (typeof raw === "number" && isFinite(raw)) {
    // Heuristic: seconds vs milliseconds. ~ < year 2286 in seconds.
    return raw < 1e12 ? Math.round(raw * 1000) : Math.round(raw)
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw)
    if (!isNaN(parsed)) return parsed
    const num = Number(raw)
    if (!isNaN(num) && num > 0) return normaliseTime(num)
  }
  return undefined
}

const pickTime = (obj: Record<string, any>): number | undefined => {
  for (const key of TIME_KEYS) {
    if (key in obj) {
      const t = normaliseTime(obj[key])
      if (t !== undefined) return t
    }
  }
  return undefined
}

const pickModel = (obj: Record<string, any>): string | undefined => {
  for (const key of MODEL_KEYS) {
    const v = obj[key]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (Array.isArray(v)) {
      const first = v.find((x) => typeof x === "string" && x.trim())
      if (first) return first.trim()
    }
  }
  // ChatGPT nests the model under metadata.model_slug.
  if (isObject(obj.metadata)) {
    const nested = pickModel(obj.metadata)
    if (nested) return nested
  }
  return undefined
}

/**
 * Pull plain text out of the many shapes "content" can take: a raw string, an
 * object with `parts`/`text`, an array of strings or `{type, text}` parts.
 */
const extractText = (content: any): string => {
  if (content == null) return ""
  if (typeof content === "string") return content
  if (typeof content === "number" || typeof content === "boolean") {
    return String(content)
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => extractText(part))
      .filter((s) => s.trim().length > 0)
      .join("\n")
  }
  if (isObject(content)) {
    if (Array.isArray(content.parts)) return extractText(content.parts)
    if (typeof content.text === "string") return content.text
    if (typeof content.content === "string") return content.content
    if (typeof content.value === "string") return content.value
    if (typeof content.body === "string") return content.body
  }
  return ""
}

const pickContent = (obj: Record<string, any>): string => {
  for (const key of CONTENT_KEYS) {
    if (key in obj) {
      const text = extractText(obj[key])
      if (text.trim().length > 0) return text
    }
  }
  return ""
}

const pickRole = (obj: Record<string, any>): "user" | "assistant" | null => {
  for (const key of ROLE_KEYS) {
    if (key in obj) {
      const role = normaliseRole(obj[key])
      if (role) return role
    }
  }
  return null
}

const pickTitle = (obj: Record<string, any>): string | undefined => {
  for (const key of TITLE_KEYS) {
    const v = obj[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

const parseMessage = (raw: any): DynamicMessage | null => {
  if (!isObject(raw)) return null
  const role = pickRole(raw)
  if (!role) return null
  const content = pickContent(raw)
  if (!content.trim()) return null
  const model = pickModel(raw)
  return {
    role,
    content: content.trim(),
    createdAt: pickTime(raw),
    modelName: role === "assistant" ? model : undefined
  }
}

/** Flatten ChatGPT-style `mapping` trees into a time-ordered message list. */
const messagesFromMapping = (mapping: Record<string, any>): any[] => {
  const nodes = Object.values(mapping).filter((n) => isObject(n) && n.message)
  return nodes
    .map((n: any) => n.message)
    .sort((a, b) => (a?.create_time ?? 0) - (b?.create_time ?? 0))
}

/** Locate a list of message-like objects inside a conversation entry. */
const findMessageList = (entry: any): any[] => {
  if (Array.isArray(entry)) return entry
  if (!isObject(entry)) return []

  // ChatGPT-style tree.
  if (isObject(entry.mapping)) return messagesFromMapping(entry.mapping)

  // Open WebUI-style nested history map.
  if (isObject(entry.history?.messages)) {
    return Object.values(entry.history.messages)
  }

  for (const key of MESSAGE_LIST_KEYS) {
    const v = entry[key]
    if (Array.isArray(v) && v.length > 0) return v
    if (isObject(v?.mapping)) return messagesFromMapping(v.mapping)
    if (Array.isArray(v?.messages)) return v.messages
  }

  return []
}

const parseConversation = (entry: any): DynamicConversation | null => {
  const rawMessages = findMessageList(entry)
  if (rawMessages.length === 0) return null

  const messages = rawMessages
    .map((m) => parseMessage(m))
    .filter((m): m is DynamicMessage => m !== null)

  if (messages.length === 0) return null

  const wrapper = isObject(entry) ? entry : {}
  // ChatGPT and some tools nest the real chat object under `chat`.
  const inner = isObject(wrapper.chat) ? wrapper.chat : {}

  const title =
    pickTitle(wrapper) ||
    pickTitle(inner) ||
    messages.find((m) => m.role === "user")?.content.slice(0, 50) ||
    "Imported Chat"

  const modelId =
    pickModel(wrapper) ||
    pickModel(inner) ||
    messages.find((m) => m.modelName)?.modelName

  const createdAt =
    pickTime(wrapper) ?? pickTime(inner) ?? messages.find((m) => m.createdAt)?.createdAt

  return { title, createdAt, modelId, messages }
}

/** Find the top-level array of conversation entries. */
const findConversationList = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (!isObject(data)) return []

  for (const key of CONVERSATION_LIST_KEYS) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key]
  }

  // The whole object might itself be a single conversation.
  if (findMessageList(data).length > 0) return [data]

  return []
}

/**
 * Inspect an arbitrary export and report what we managed to extract, without
 * committing it to the database. Used to drive the import preview UI.
 */
export const analyzeDynamicImport = (data: any): DynamicAnalysis => {
  const entries = findConversationList(data)
  const conversations: DynamicConversation[] = []

  for (const entry of entries) {
    const convo = parseConversation(entry)
    if (convo) conversations.push(convo)
  }

  const messageCount = conversations.reduce(
    (sum, c) => sum + c.messages.length,
    0
  )
  const hasModel = conversations.some((c) => !!c.modelId)

  return {
    conversations,
    conversationCount: conversations.length,
    messageCount,
    hasModel
  }
}

const buildChat = (
  conversations: DynamicConversation[],
  options: { defaultModelId?: string } = {}
): { chat: { history: HistoryInfo; messages: Message[] }[] } => {
  const chat: { history: HistoryInfo; messages: Message[] }[] = []

  for (const convo of conversations) {
    const historyId = generateID()
    const createdAt = convo.createdAt ?? Date.now()
    const modelId = convo.modelId || options.defaultModelId

    const history: HistoryInfo = {
      id: historyId,
      title: convo.title,
      is_rag: false,
      message_source: "web-ui",
      createdAt,
      model_id: modelId
    }

    const messages: Message[] = convo.messages.map((m, index) => {
      const isAssistant = m.role === "assistant"
      const name = isAssistant ? m.modelName || modelId || "" : ""
      return {
        id: generateID(),
        history_id: historyId,
        name,
        role: m.role,
        content: m.content,
        images: [],
        sources: [],
        createdAt: (m.createdAt ?? createdAt) + index,
        modelName: isAssistant ? m.modelName || modelId : undefined
      }
    })

    chat.push({ history, messages })
  }

  return { chat }
}

/**
 * Convert an arbitrary export into the Page Assist import shape
 * (`{ chat: [{ history, messages }] }`) so it flows through the existing import
 * pipeline. `defaultModelId` is applied wherever the source lacked a model.
 */
export const convertDynamicToPageAssist = (
  data: any,
  options: { defaultModelId?: string } = {}
): { chat: { history: HistoryInfo; messages: Message[] }[] } => {
  return buildChat(analyzeDynamicImport(data).conversations, options)
}

/* -------------------------------------------------------------------------- */
/* Manual (power-user) field mapping                                           */
/* -------------------------------------------------------------------------- */

/**
 * A user-authored description of where the interesting fields live in a
 * third-party export, used when auto-detection fails or guesses wrong. Empty
 * string for a path means "the item itself"; empty string for a field means
 * "fall back to auto-detection for that field".
 */
export type DynamicMapping = {
  /** Dot path from the root to the array of conversations. "" = root. */
  conversationsPath: string
  /**
   * How messages relate to conversations:
   * - "nested": messages live inside each conversation at `messagesPath`.
   * - "joined": messages are a separate array at `messagesPath` (from the
   *   root), linked to conversations by `conversationIdField` ===
   *   `messageThreadField` (relational export, e.g. threads + messages).
   */
  messageMode: "nested" | "joined"
  /**
   * Nested: dot path from a conversation to its messages ("" = the
   * conversation). Joined: dot path from the root to the messages array.
   */
  messagesPath: string
  /** Joined only: field on a conversation holding its id. */
  conversationIdField?: string
  /** Joined only: field on a message referencing its conversation's id. */
  messageThreadField?: string
  /** Field on a message holding the role. */
  roleField: string
  /** Field on a message holding the text content. */
  contentField: string
  /** Raw role value that means "user" (case-insensitive). */
  userValue?: string
  /** Raw role value that means "assistant" (case-insensitive). */
  assistantValue?: string
  /** Field on a conversation holding its title. */
  titleField?: string
  /** Field holding a timestamp (checked on message, then conversation). */
  timeField?: string
  /** Field holding a model id (checked on message, then conversation). */
  modelField?: string
}

// Fields a message commonly uses to reference its parent conversation.
const JOIN_REF_KEYS = [
  "threadId",
  "thread_id",
  "conversationId",
  "conversation_id",
  "chatId",
  "chat_id",
  "sessionId",
  "session_id",
  "parentId",
  "parent_id"
]

// Fields a conversation commonly uses as its own id.
const JOIN_ID_KEYS = [
  "threadId",
  "thread_id",
  "conversationId",
  "conversation_id",
  "chatId",
  "chat_id",
  "sessionId",
  "session_id",
  "id",
  "_id",
  "uuid"
]

/** A join key value, coerced to a comparable string (strings or numbers). */
const asKey = (v: any): string | undefined => {
  if (typeof v === "string" && v.trim()) return v.trim()
  if (typeof v === "number" && isFinite(v)) return String(v)
  return undefined
}

/** Heuristic: does this object look like a single chat message? */
const looksLikeMessage = (m: any): boolean =>
  isObject(m) &&
  (pickRole(m) !== null || ROLE_KEYS.some((k) => k in m)) &&
  CONTENT_KEYS.some((k) => k in m)

/**
 * Find the best (conversationIdField, messageThreadField) pair by sampling
 * which message-reference values actually point at which conversation ids.
 */
const detectJoin = (
  conversations: any[],
  messages: any[]
): { idField: string; refField: string } | null => {
  if (!conversations.length || !messages.length) return null
  if (!isObject(conversations[0]) || !isObject(messages[0])) return null

  const convSample = conversations.slice(0, 100)
  const msgSample = messages.slice(0, 200)

  let best: { idField: string; refField: string; overlap: number } | null = null

  for (const refField of JOIN_REF_KEYS) {
    if (!(refField in messages[0])) continue
    const refValues = new Set(
      msgSample
        .map((m) => asKey(getByPath(m, refField)))
        .filter((v): v is string => !!v)
    )
    if (refValues.size === 0) continue

    for (const idField of JOIN_ID_KEYS) {
      if (!(idField in conversations[0])) continue
      let overlap = 0
      for (const c of convSample) {
        const id = asKey(getByPath(c, idField))
        if (id && refValues.has(id)) overlap++
      }
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { idField, refField, overlap }
      }
    }
  }

  return best ? { idField: best.idField, refField: best.refField } : null
}

const asString = (v: any): string | undefined => {
  if (typeof v === "string" && v.trim()) return v.trim()
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === "string" && x.trim())
    if (first) return first.trim()
  }
  return undefined
}

/** Resolve a dot-separated path against a value. "" returns the value as-is. */
export const getByPath = (obj: any, path: string): any => {
  if (!path) return obj
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc == null ? undefined : acc[key]),
      obj as any
    )
}

/** Resolve a message list from a conversation, flattening mapping objects. */
const resolveMessageArray = (conv: any, path: string): any[] => {
  const value = getByPath(conv, path)
  if (Array.isArray(value)) return value
  if (isObject(value)) {
    const values = Object.values(value)
    if (values.some((n) => isObject(n) && (n as any).message)) {
      return messagesFromMapping(value)
    }
    return values
  }
  return []
}

const resolveRole = (
  value: any,
  mapping: DynamicMapping
): "user" | "assistant" | null => {
  const str =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : isObject(value) && typeof value.role === "string"
        ? value.role.trim().toLowerCase()
        : ""

  if (mapping.userValue?.trim() || mapping.assistantValue?.trim()) {
    if (
      mapping.userValue?.trim() &&
      str === mapping.userValue.trim().toLowerCase()
    ) {
      return "user"
    }
    if (
      mapping.assistantValue?.trim() &&
      str === mapping.assistantValue.trim().toLowerCase()
    ) {
      return "assistant"
    }
    return null
  }

  return normaliseRole(value)
}

/** Apply an explicit field mapping to produce conversations. */
export const parseWithMapping = (
  data: any,
  mapping: DynamicMapping
): DynamicConversation[] => {
  const convRaw = getByPath(data, mapping.conversationsPath)
  const convArr = Array.isArray(convRaw)
    ? convRaw
    : convRaw != null
      ? [convRaw]
      : []

  // For the relational "joined" layout, group the flat message list by the
  // conversation id they reference, so each conversation can look its own up.
  let grouped: Map<string, any[]> | null = null
  if (mapping.messageMode === "joined") {
    const allRaw = getByPath(data, mapping.messagesPath)
    const allMessages = Array.isArray(allRaw) ? allRaw : []
    grouped = new Map()
    for (const m of allMessages) {
      const key = mapping.messageThreadField
        ? asKey(getByPath(m, mapping.messageThreadField))
        : undefined
      if (key == null) continue
      const bucket = grouped.get(key)
      if (bucket) bucket.push(m)
      else grouped.set(key, [m])
    }
  }

  const sortTime = (m: any): number =>
    (mapping.timeField
      ? normaliseTime(getByPath(m, mapping.timeField))
      : isObject(m)
        ? pickTime(m)
        : undefined) ?? 0

  const conversations: DynamicConversation[] = []

  for (const conv of convArr) {
    let rawMessages: any[]
    if (mapping.messageMode === "joined") {
      const cid = mapping.conversationIdField
        ? asKey(getByPath(conv, mapping.conversationIdField))
        : undefined
      rawMessages = (cid != null && grouped!.get(cid)) || []
      rawMessages = [...rawMessages].sort((a, b) => sortTime(a) - sortTime(b))
    } else {
      rawMessages = resolveMessageArray(conv, mapping.messagesPath)
    }

    const messages: DynamicMessage[] = []

    rawMessages.forEach((m) => {
      const roleValue = mapping.roleField ? getByPath(m, mapping.roleField) : m
      const role = resolveRole(roleValue, mapping)
      if (!role) return

      const content = (
        mapping.contentField
          ? extractText(getByPath(m, mapping.contentField))
          : pickContent(isObject(m) ? m : {})
      ).trim()
      if (!content) return

      const createdAt = mapping.timeField
        ? normaliseTime(getByPath(m, mapping.timeField))
        : isObject(m)
          ? pickTime(m)
          : undefined

      const modelName =
        role === "assistant"
          ? mapping.modelField
            ? asString(getByPath(m, mapping.modelField))
            : isObject(m)
              ? pickModel(m)
              : undefined
          : undefined

      messages.push({ role, content, createdAt, modelName })
    })

    if (messages.length === 0) continue

    const wrapper = isObject(conv) ? conv : {}

    const title =
      (mapping.titleField
        ? asString(getByPath(wrapper, mapping.titleField))
        : pickTitle(wrapper)) ||
      messages.find((m) => m.role === "user")?.content.slice(0, 50) ||
      "Imported Chat"

    const modelId =
      (mapping.modelField
        ? asString(getByPath(wrapper, mapping.modelField))
        : pickModel(wrapper)) || messages.find((m) => m.modelName)?.modelName

    const createdAt =
      (mapping.timeField
        ? normaliseTime(getByPath(wrapper, mapping.timeField))
        : pickTime(wrapper)) ?? messages.find((m) => m.createdAt)?.createdAt

    conversations.push({ title, createdAt, modelId, messages })
  }

  return conversations
}

/** Preview the result of a mapping without committing it. */
export const analyzeMapping = (
  data: any,
  mapping: DynamicMapping
): DynamicAnalysis => {
  const conversations = parseWithMapping(data, mapping)
  const messageCount = conversations.reduce(
    (sum, c) => sum + c.messages.length,
    0
  )
  const hasModel = conversations.some((c) => !!c.modelId)
  return {
    conversations,
    conversationCount: conversations.length,
    messageCount,
    hasModel
  }
}

/** Convert using an explicit field mapping. */
export const convertWithMapping = (
  data: any,
  mapping: DynamicMapping,
  options: { defaultModelId?: string } = {}
): { chat: { history: HistoryInfo; messages: Message[] }[] } => {
  return buildChat(parseWithMapping(data, mapping), options)
}

/**
 * Best-effort guess of a mapping using the same heuristics as auto-detection,
 * so the manual mapping form starts pre-filled instead of blank.
 */
export const inferMapping = (data: any): DynamicMapping => {
  // 1. Locate the conversations array.
  let conversationsPath = ""
  if (!Array.isArray(data) && isObject(data)) {
    const key = CONVERSATION_LIST_KEYS.find(
      (k) => Array.isArray(data[k]) && data[k].length > 0
    )
    if (key) conversationsPath = key
  }

  const convRaw = getByPath(data, conversationsPath)
  const sampleConv = Array.isArray(convRaw) ? convRaw[0] : convRaw

  // 2. Decide layout: nested vs joined (separate top-level message list).
  const convHasNested =
    isObject(sampleConv) &&
    (isObject(sampleConv.mapping) ||
      isObject(sampleConv.history?.messages) ||
      MESSAGE_LIST_KEYS.some(
        (k) => Array.isArray(sampleConv[k]) && sampleConv[k].length > 0
      ))

  let messageMode: "nested" | "joined" = "nested"
  let messagesPath = ""
  let conversationIdField: string | undefined
  let messageThreadField: string | undefined

  if (isObject(data) && !convHasNested) {
    const msgKey = MESSAGE_LIST_KEYS.find(
      (k) =>
        k !== conversationsPath &&
        Array.isArray((data as any)[k]) &&
        (data as any)[k].length > 0 &&
        looksLikeMessage((data as any)[k][0])
    )
    if (msgKey) {
      const join = detectJoin(
        Array.isArray(convRaw) ? convRaw : [],
        (data as any)[msgKey]
      )
      if (join) {
        messageMode = "joined"
        messagesPath = msgKey
        conversationIdField = join.idField
        messageThreadField = join.refField
      }
    }
  }

  // 3. Nested layout: find the per-conversation message path.
  if (messageMode === "nested" && isObject(sampleConv)) {
    if (isObject(sampleConv.mapping)) {
      messagesPath = "mapping"
    } else if (isObject(sampleConv.history?.messages)) {
      messagesPath = "history.messages"
    } else {
      const key = MESSAGE_LIST_KEYS.find(
        (k) =>
          Array.isArray(sampleConv[k]) && (sampleConv[k] as any[]).length > 0
      )
      if (key) messagesPath = key
    }
  }

  // 4. Sample a handful of messages from whichever layout we chose, so fields
  //    that are only populated on some turns (e.g. model on assistant turns)
  //    are still detected.
  const sampleMsgs = (
    messageMode === "joined"
      ? ((getByPath(data, messagesPath) as any[]) ?? [])
      : resolveMessageArray(sampleConv, messagesPath)
  )
    .filter(isObject)
    .slice(0, 20)

  const hasFieldWith = (keys: string[], test: (v: any) => boolean) =>
    keys.find((k) => sampleMsgs.some((m) => k in m && test(m[k])))

  // 5. Detect the message-level fields.
  let roleField = ""
  let contentField = ""
  let timeField: string | undefined
  let modelField: string | undefined
  if (sampleMsgs.length > 0) {
    roleField = hasFieldWith(ROLE_KEYS, () => true) ?? ""
    contentField =
      hasFieldWith(CONTENT_KEYS, (v) => extractText(v).trim().length > 0) ?? ""
    timeField = hasFieldWith(TIME_KEYS, () => true)
    modelField = hasFieldWith(MODEL_KEYS, (v) => !!asString(v))
  }

  const titleField = isObject(sampleConv)
    ? TITLE_KEYS.find((k) => typeof sampleConv[k] === "string")
    : undefined

  return {
    conversationsPath,
    messageMode,
    messagesPath,
    conversationIdField,
    messageThreadField,
    roleField,
    contentField,
    titleField,
    timeField,
    modelField
  }
}

/** Collect dot paths to non-empty arrays inside an object (for suggestions). */
export const suggestArrayPaths = (
  data: any,
  prefix = "",
  depth = 0,
  acc: string[] = []
): string[] => {
  if (Array.isArray(data)) {
    if (!acc.includes(prefix)) acc.push(prefix)
    return acc
  }
  if (!isObject(data) || depth > 3) return acc
  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) {
      if (value.length > 0 && !acc.includes(path)) acc.push(path)
    } else if (isObject(value)) {
      suggestArrayPaths(value, path, depth + 1, acc)
    }
  }
  return acc
}

/** List the field names available on a sample object (for suggestions). */
export const suggestFields = (sample: any): string[] => {
  if (!isObject(sample)) return []
  return Object.keys(sample)
}

/** Resolve a list of sample messages from data + a (partial) mapping. */
const sampleMessagesFor = (data: any, mapping: DynamicMapping): any[] => {
  if (mapping.messageMode === "joined") {
    const arr = getByPath(data, mapping.messagesPath)
    return Array.isArray(arr) ? arr : []
  }
  const convRaw = getByPath(data, mapping.conversationsPath)
  const conv = Array.isArray(convRaw) ? convRaw[0] : convRaw
  return resolveMessageArray(conv, mapping.messagesPath)
}

/** Resolve a sample message object from data + a (partial) mapping. */
export const sampleMessageFor = (
  data: any,
  mapping: DynamicMapping
): any => sampleMessagesFor(data, mapping)[0]

/** Resolve a sample conversation object from data + a (partial) mapping. */
export const sampleConversationFor = (
  data: any,
  mapping: DynamicMapping
): any => {
  const convRaw = getByPath(data, mapping.conversationsPath)
  return Array.isArray(convRaw) ? convRaw[0] : convRaw
}

/** Distinct values found at the role field across sample messages. */
export const distinctRoleValues = (
  data: any,
  mapping: DynamicMapping
): string[] => {
  const messages = sampleMessagesFor(data, mapping)
  const values = new Set<string>()
  for (const m of messages) {
    const v = mapping.roleField ? getByPath(m, mapping.roleField) : m
    const s =
      typeof v === "string"
        ? v
        : isObject(v) && typeof v.role === "string"
          ? v.role
          : undefined
    if (s) values.add(s)
    if (values.size >= 12) break
  }
  return Array.from(values)
}
