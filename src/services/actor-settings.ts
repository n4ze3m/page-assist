import { Storage } from "@plasmohq/storage"
import {
  ACTOR_SETTINGS_VERSION,
  ActorSettings,
  ActorAspect,
  createDefaultActorSettings
} from "@/types/actor"

const storage = new Storage({
  area: "local"
})

export const getActorStorageKey = (chatKey: string) =>
  `actorSettings:${chatKey}`

export const getActorProfileStorageKey = (characterId: string | number) =>
  `actorProfile:${String(characterId)}`

export const resolveActorChatKey = (params: {
  historyId: string | null
  serverChatId: string | null
}): string => {
  const { historyId, serverChatId } = params
  if (serverChatId) {
    return `server:${serverChatId}`
  }
  if (historyId) {
    return `local:${historyId}`
  }
  // Fallback key for temporary/unsaved chats.
  return "scratch"
}

const isValidActorAspect = (value: any): value is ActorAspect => {
  if (!value || typeof value !== "object") return false

  const { id, key, target, name, source, value: aspectValue } = value as {
    id: unknown
    key: unknown
    target: unknown
    name: unknown
    source: unknown
    value: unknown
  }

  const isString = (v: unknown): v is string => typeof v === "string"

  if (
    !isString(id) ||
    !isString(key) ||
    !isString(target) ||
    !isString(name) ||
    !isString(source) ||
    !isString(aspectValue)
  ) {
    return false
  }

  // Basic enum checks; if these ever expand, this guard can be relaxed.
  const validTargets = ["user", "char", "world"]
  const validSources = ["free", "lore"]

  if (!validTargets.includes(target) || !validSources.includes(source)) {
    return false
  }

  return true
}

const isValidActorSettings = (raw: any): raw is ActorSettings => {
  if (!raw || typeof raw !== "object") {
    return false
  }

  const isNumber = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v)
  const isBoolean = (v: unknown): v is boolean => typeof v === "boolean"
  const isString = (v: unknown): v is string => typeof v === "string"

  const {
    version,
    isEnabled,
    aspects,
    notes,
    notesGmOnly,
    chatPosition,
    chatDepth,
    chatRole,
    templateMode
  } = raw as Partial<ActorSettings>

  if (!isNumber(version)) return false
  if (!isBoolean(isEnabled)) return false
  if (!Array.isArray(aspects) || !aspects.every(isValidActorAspect)) {
    return false
  }
  if (!isString(notes)) return false

  if (notesGmOnly !== undefined && !isBoolean(notesGmOnly)) {
    return false
  }

  if (!isString(chatPosition)) return false
  const validPositions = ["before", "after", "depth"]
  if (!validPositions.includes(chatPosition)) return false

  if (!isNumber(chatDepth)) return false

  if (!isString(chatRole)) return false
  const validRoles = ["system", "user", "assistant"]
  if (!validRoles.includes(chatRole)) return false

  if (templateMode !== undefined) {
    if (!isString(templateMode)) return false
    const validTemplateModes = ["merge", "override", "ignore"]
    if (!validTemplateModes.includes(templateMode)) return false
  }

  return true
}

const migrateSettings = (raw: any): ActorSettings => {
  if (!raw || typeof raw !== "object") {
    return createDefaultActorSettings()
  }

  const version: number = Number(raw.version ?? 0)

  if (version < ACTOR_SETTINGS_VERSION) {
    // No legacy prompts to preserve; reset to new neutral defaults.
    return createDefaultActorSettings()
  }

  if (!isValidActorSettings(raw)) {
    console.warn(
      "Invalid Actor settings found in storage; resetting to defaults.",
      raw
    )
    return createDefaultActorSettings()
  }

  return raw as ActorSettings
}

const getActorSettingsForChatOrNull = async (params: {
  historyId: string | null
  serverChatId: string | null
}): Promise<ActorSettings | null> => {
  try {
    const chatKey = resolveActorChatKey(params)
    const key = getActorStorageKey(chatKey)
    const stored = await storage.get<ActorSettings | undefined>(key)
    if (!stored) {
      return null
    }
    return migrateSettings(stored)
  } catch (error) {
    console.error("Failed to load Actor settings", error)
    return null
  }
}

export const getActorSettingsForChat = async (params: {
  historyId: string | null
  serverChatId: string | null
}): Promise<ActorSettings> => {
  const existing = await getActorSettingsForChatOrNull(params)
  if (existing) {
    return existing
  }
  return createDefaultActorSettings()
}

export const saveActorSettingsForChat = async (params: {
  historyId: string | null
  serverChatId: string | null
  settings: ActorSettings
}): Promise<boolean> => {
  try {
    const chatKey = resolveActorChatKey(params)
    const key = getActorStorageKey(chatKey)
    const payload: ActorSettings = {
      ...params.settings,
      version: ACTOR_SETTINGS_VERSION
    }
    await storage.set(key, payload)
    return true
  } catch (error) {
    console.error("Failed to save Actor settings", error)
    return false
  }
}

export const getActorProfileForCharacter = async (
  characterId: string | number | null | undefined
): Promise<ActorSettings | null> => {
  if (!characterId) return null
  try {
    const key = getActorProfileStorageKey(characterId)
    const stored = await storage.get<ActorSettings | undefined>(key)
    if (!stored) {
      return null
    }
    return migrateSettings(stored)
  } catch (error) {
    console.error("Failed to load Actor profile for character", error)
    return null
  }
}

export const saveActorProfileForCharacter = async (params: {
  characterId: string | number
  settings: ActorSettings
}): Promise<void> => {
  try {
    const key = getActorProfileStorageKey(params.characterId)
    const payload: ActorSettings = {
      ...params.settings,
      version: ACTOR_SETTINGS_VERSION
    }
    await storage.set(key, payload)
  } catch (error) {
    console.error("Failed to save Actor profile for character", error)
  }
}

export const getActorSettingsForChatWithCharacterFallback = async (params: {
  historyId: string | null
  serverChatId: string | null
  characterId?: string | number | null
}): Promise<ActorSettings> => {
  const { historyId, serverChatId, characterId } = params
  const existing = await getActorSettingsForChatOrNull({
    historyId,
    serverChatId
  })
  if (existing) {
    return existing
  }

  const profile = await getActorProfileForCharacter(characterId ?? null)
  if (profile) {
    return profile
  }

  return createDefaultActorSettings()
}
