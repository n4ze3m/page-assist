import { Storage } from "@plasmohq/storage"
import {
  ACTOR_SETTINGS_VERSION,
  ActorSettings,
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

const migrateSettings = (raw: any): ActorSettings => {
  if (!raw || typeof raw !== "object") {
    return createDefaultActorSettings()
  }

  const version: number = Number(raw.version ?? 0)

  if (!version || version < ACTOR_SETTINGS_VERSION) {
    // No legacy prompts to preserve; reset to new neutral defaults.
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
}): Promise<void> => {
  try {
    const chatKey = resolveActorChatKey(params)
    const key = getActorStorageKey(chatKey)
    const payload: ActorSettings = {
      ...params.settings,
      version: ACTOR_SETTINGS_VERSION
    }
    await storage.set(key, payload)
  } catch (error) {
    console.error("Failed to save Actor settings", error)
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
