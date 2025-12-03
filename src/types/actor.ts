export type ActorTarget = "user" | "char" | "world"

export type ActorSource = "free" | "lore"

export type ActorAspect = {
  /**
   * Internal stable identifier for this aspect within a chat.
   * Not exposed to the user directly.
   */
  id: string

  /**
   * Stable token/key name used when exposing this aspect
   * to chat dictionaries or other templating systems.
   */
  key: string

  /**
   * High-level target this aspect describes.
   */
  target: ActorTarget

  /**
   * Human-readable label, e.g. "Role", "Mood", "Location".
   */
  name: string

  /**
   * Data source. Phase 1 only uses "free".
   */
  source: ActorSource

  /**
   * Canonical lore/worldbook identifier when source === "lore".
   * Reserved for future phases.
   */
  lorebookId?: string

  /**
   * Canonical entry identifier from the lore/worldbook system.
   * Reserved for future phases.
   */
  entryId?: string

  /**
   * Current value for this aspect (free-form text).
   */
  value: string
}

export type ActorChatPosition = "before" | "after" | "depth"

export type ActorChatRole = "system" | "user" | "assistant"

export type ActorTemplateInteractionMode = "merge" | "override" | "ignore"

/**
 * Soft UI limits for Actor configuration. These are not hard
 * protocol limits; they are guardrails to keep prompts small
 * and focused. Values can be tuned centrally here or via env.
 */
const env = (import.meta as any)?.env as
  | {
      VITE_ACTOR_ASPECT_SOFT_LIMIT?: string
      VITE_ACTOR_TOKENS_WARNING_THRESHOLD?: string
    }
  | undefined

const parsePositiveInt = (
  raw: string | undefined,
  fallback: number
): number => {
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

export const ACTOR_ASPECT_SOFT_LIMIT: number = parsePositiveInt(
  env?.VITE_ACTOR_ASPECT_SOFT_LIMIT,
  20
)

export const ACTOR_TOKENS_WARNING_THRESHOLD: number = parsePositiveInt(
  env?.VITE_ACTOR_TOKENS_WARNING_THRESHOLD,
  512
)

export type ActorSettings = {
  /**
   * Schema version to allow future migrations.
   */
  version: number

  /**
   * Whether Actor is active for this chat.
   */
  isEnabled: boolean

  /**
   * Collection of aspects configured for this chat.
   *
   * Phase 1 uses a fixed/default set; later phases will
   * support adding/removing and binding to lore/worldbooks.
   */
  aspects: ActorAspect[]

  /**
   * Free-form scene notes sent to the model as part of the
   * Actor prompt (Phase 1 always sends notes when non-empty).
   */
  notes: string

  /**
   * When true, notes are GM-only and MUST NOT be sent to the model.
   * They remain visible in the UI but are excluded from Actor prompt text.
   */
  notesGmOnly?: boolean

  /**
   * Where Actor prompt text is injected relative to the
   * main prompt / story string.
   *
   * "before" / "after" control placement relative to system
   * prompts; "depth" inserts into the in-chat history at the
   * configured chatDepth.
   */
  chatPosition: ActorChatPosition

  /**
   * Depth index for in-chat insertion when chatPosition === "depth".
   * Counts non-system messages from the start of the chat history.
   */
  chatDepth: number

  /**
   * Role used when injecting Actor text as a chat message.
   */
  chatRole: ActorChatRole

  /**
   * How Actor interacts with scene / prompt templates when they are active.
   * "merge"   – Actor content is merged with templates (default).
   * "override" – Actor may replace overlapping template fields.
   * "ignore" – Actor is skipped when templates are active.
   */
  templateMode?: ActorTemplateInteractionMode
}

export const ACTOR_SETTINGS_VERSION = 3

/**
 * Default aspects for new chats.
 * These are intentionally general-purpose and free-text only.
 */
export const DEFAULT_ACTOR_ASPECTS: ActorAspect[] = [
  // User-focused aspects
  {
    id: "user_role",
    key: "user_role",
    target: "user",
    name: "User role",
    source: "free",
    value: ""
  },
  {
    id: "user_state",
    key: "user_state",
    target: "user",
    name: "User emotional state",
    source: "free",
    value: ""
  },
  {
    id: "user_focus",
    key: "user_focus",
    target: "user",
    name: "User focus/objective",
    source: "free",
    value: ""
  },
  // Character-focused aspects
  {
    id: "char_role",
    key: "char_role",
    target: "char",
    name: "Character role",
    source: "free",
    value: ""
  },
  {
    id: "char_state",
    key: "char_state",
    target: "char",
    name: "Character emotional state",
    source: "free",
    value: ""
  },
  {
    id: "char_goal",
    key: "char_goal",
    target: "char",
    name: "Character goal",
    source: "free",
    value: ""
  },
  // World-focused aspects
  {
    id: "world_location",
    key: "world_location",
    target: "world",
    name: "Location",
    source: "free",
    value: ""
  },
  {
    id: "world_time_of_day",
    key: "world_time_of_day",
    target: "world",
    name: "Time of day",
    source: "free",
    value: ""
  },
  {
    id: "world_weather",
    key: "world_weather",
    target: "world",
    name: "Weather",
    source: "free",
    value: ""
  },
  {
    id: "world_lighting",
    key: "world_lighting",
    target: "world",
    name: "Lighting",
    source: "free",
    value: ""
  },
  {
    id: "world_tone",
    key: "world_tone",
    target: "world",
    name: "Scene tone",
    source: "free",
    value: ""
  }
]

export const createDefaultActorSettings = (): ActorSettings => ({
  version: ACTOR_SETTINGS_VERSION,
  isEnabled: false,
  aspects: DEFAULT_ACTOR_ASPECTS.map((a) => ({ ...a })),
  notes: "",
  chatPosition: "before",
  chatDepth: 0,
  chatRole: "system",
  notesGmOnly: false,
  templateMode: "merge"
})
