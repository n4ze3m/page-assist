import type {
  ActorSettings,
  ActorTarget,
  ActorTemplateInteractionMode
} from "@/types/actor"
import type { BaseMessage } from "@langchain/core/messages"
import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { systemPromptFormatter } from "@/utils/system-message"

export type ActorDictionaryToken = {
  /**
   * Full token string, e.g. [[actor_user_clothes]]
   */
  token: string
  /**
   * Underlying aspect identifier.
   */
  aspectId: string
  /**
   * Stable key used for this token (without actor_ prefix).
   */
  key: string
  /**
   * High-level target this token describes.
   */
  target: ActorTarget
  /**
   * Human-readable aspect name.
   */
  name: string
  /**
   * Current value for this aspect (may be empty).
   */
  value: string
}

/**
 * Build per-aspect dictionary-style tokens from Actor settings.
 *
 * Tokens follow the convention:
 *   [[actor_<key>]]
 *
 * where `key` is the stable ActorAspect.key (e.g. "user_clothes").
 */
export const buildActorDictionaryTokens = (
  settings: ActorSettings | null
): ActorDictionaryToken[] => {
  if (!settings) return []

  const tokens: ActorDictionaryToken[] = []

  for (const aspect of settings.aspects || []) {
    const key = aspect.key?.trim()
    if (!key) continue

    const token = `[[actor_${key}]]`
    const value = aspect.value?.trim() || ""

    tokens.push({
      token,
      aspectId: aspect.id,
      key,
      target: aspect.target,
      name: aspect.name,
      value
    })
  }

  return tokens
}

export type ActorTemplateDecision = "merge" | "override" | "ignore"

/**
 * Decide how Actor should behave when scene templates are active.
 *
 * This is a small helper that centralizes interpretation of
 * ActorSettings.templateMode. Callers can use the returned value to:
 * - skip Actor injection entirely when "ignore"
 * - treat "override" differently once a template system exists
 * - default to "merge" in all other cases.
 */
export const getActorTemplateDecision = (params: {
  settings: ActorSettings | null | undefined
  templatesActive: boolean
}): ActorTemplateDecision => {
  const { settings, templatesActive } = params
  const mode: ActorTemplateInteractionMode =
    settings?.templateMode || "merge"

  if (!templatesActive) {
    // When templates are not active, Actor behaves as a normal merge.
    return "merge"
  }

  if (mode === "ignore") {
    return "ignore"
  }

  if (mode === "override") {
    return "override"
  }

  return "merge"
}

/**
 * Convenience helper to answer "should we inject Actor at all?"
 * in a template-aware pipeline.
 *
 * - When templates are inactive, this always returns true (Actor is allowed).
 * - When templates are active and templateMode === "ignore", this returns false.
 * - In all other cases, it returns true.
 */
export const shouldInjectActorForTemplates = (params: {
  settings: ActorSettings | null | undefined
  templatesActive: boolean
}): boolean => {
  const decision = getActorTemplateDecision(params)
  return decision !== "ignore"
}

export const buildActorPrompt = (settings: ActorSettings | null): string => {
  if (!settings || !settings.isEnabled) {
    return ""
  }

  const lines: string[] = []

  for (const aspect of settings.aspects || []) {
    const value = aspect.value?.trim()
    if (!value) continue

    const nameLower = aspect.name.toLowerCase()

    if (aspect.target === "user") {
      lines.push(`{{user}}'s ${nameLower} is ${value}.`)
    } else if (aspect.target === "char") {
      lines.push(`{{char}}'s ${nameLower} is ${value}.`)
    } else if (aspect.target === "world") {
      lines.push(`The ${nameLower} is ${value}.`)
    }
  }

  const notes =
    settings.notesGmOnly === true ? "" : settings.notes?.trim() ?? ""

  if (lines.length === 0 && !notes) {
    return ""
  }

  let result = ""

  if (lines.length > 0) {
    result += "Scene information:\n" + lines.join("\n")
  }

  if (notes) {
    if (result.length > 0) {
      result += "\n"
    }
    result += `Scene notes: ${notes}`
  }

  return result
}

/**
 * Rough token estimate for an Actor prompt.
 * Mirrors the heuristic used in TldwChatService.
 */
export const estimateActorTokens = (content: string): number => {
  const text = content || ""
  if (!text.length) return 0
  const totalChars = text.length
  return Math.ceil(totalChars / 4)
}

/**
 * Build a LangChain message for the Actor prompt using the
 * configured chatRole. For "system" we reuse systemPromptFormatter
 * so date/model placeholders are supported; for "user"/"assistant"
 * we emit simple Human/AI messages.
 */
export const buildActorMessage = async (
  settings: ActorSettings | null | undefined,
  content: string
): Promise<BaseMessage | null> => {
  const text = content.trim()
  if (!settings || !text) return null

  const role = settings.chatRole || "system"

  if (role === "user") {
    return new HumanMessage({
      content: text
    })
  }

  if (role === "assistant") {
    return new AIMessage({
      content: text
    })
  }

  // Default/system role
  return await systemPromptFormatter({
    content: text
  })
}

/**
 * Insert the Actor message into an existing LangChain history with
 * support for before / after / depth semantics.
 *
 * - "before": Actor message is prepended.
 * - "after": Actor message is inserted after any leading system messages.
 * - "depth": Actor message is inserted after `chatDepth` non-system
 *   messages (counted from the start). Falls back to appending if the
 *   depth is beyond the end of the history.
 */
export const injectActorMessageIntoHistory = (
  history: BaseMessage[],
  actorMessage: BaseMessage,
  settings: ActorSettings | null | undefined
): BaseMessage[] => {
  if (!settings) return history

  const position = settings.chatPosition || "before"

  if (position === "before") {
    return [actorMessage, ...history]
  }

  if (position === "after") {
    const next = [...history]
    let insertIndex = 0
    while (
      insertIndex < next.length &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next[insertIndex] as any)?._getType?.() === "system"
    ) {
      insertIndex++
    }
    next.splice(insertIndex, 0, actorMessage)
    return next
  }

  // depth-based insertion
  const depthRaw = settings.chatDepth
  const depth =
    Number.isFinite(depthRaw) && depthRaw >= 0
      ? Math.min(depthRaw, 999)
      : 0

  let seenNonSystem = 0
  const result: BaseMessage[] = []
  let inserted = false

  for (const msg of history) {
    const msgType = (msg as any)?._getType?.()

    if (!inserted && msgType !== "system" && seenNonSystem >= depth) {
      result.push(actorMessage)
      inserted = true
    }

    result.push(msg)

    if (msgType !== "system") {
      seenNonSystem++
    }
  }

  if (!inserted) {
    result.push(actorMessage)
  }

  return result
}
