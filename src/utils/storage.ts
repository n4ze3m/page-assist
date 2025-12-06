import { Storage } from "@plasmohq/storage"
import type { BaseStorage } from "@plasmohq/storage"

// Local storage for storageSyncEnabled setting (to avoid circular dependency)
const configStorage = new Storage({
  area: "local"
})

// Global storage instances
let globalSyncStorage: Storage | null = null
let globalLocalStorage: Storage | null = null

/**
 * Get a dynamic storage instance for use with useStorage hook
 * This creates a proxy Storage that switches between sync and local based on storageSyncEnabled
 * Note: This is a workaround since useStorage hook requires a synchronous Storage instance
 */
export const getDynamicStorageForHook = (): Storage => {
  if (!globalLocalStorage) {
    globalLocalStorage = new Storage({ area: "local" })
  }

  // For now, return local storage for hooks
  // The actual sync behavior is handled by service layer functions
  // This prevents hooks from accidentally syncing when storageSyncEnabled is false
  return globalLocalStorage
}

/**
 * Dynamic Storage class that automatically switches between sync and local area
 * based on the storageSyncEnabled setting
 */
export class DynamicStorage {
  private syncStorage: Storage
  private localStorage: Storage

  constructor() {
    this.syncStorage = new Storage({ area: "sync" })
    this.localStorage = new Storage({ area: "local" })
  }

  private async getStorage(): Promise<Storage> {
    const storageSyncEnabled = await configStorage.get<boolean>("storageSyncEnabled")
    const enabled = storageSyncEnabled ?? true // Default to true
    return enabled ? this.syncStorage : this.localStorage
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    const storage = await this.getStorage()
    return storage.get<T>(key)
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    const storage = await this.getStorage()
    return storage.set(key, value)
  }

  async remove(key: string): Promise<void> {
    const storage = await this.getStorage()
    return storage.remove(key)
  }

  watch(config: Record<string, (change: any) => void>): void {
    // Watch both storages simultaneously
    this.syncStorage.watch(config)
    this.localStorage.watch(config)
  }
}

/**
 * Always uses local storage (for sensitive data or local state)
 */
export const getLocalStorage = (): Storage => {
  return new Storage({
    area: "local"
  })
}

/**
 * Migrates data from one storage area to another when storageSyncEnabled setting changes
 * @param newValue The new value of storageSyncEnabled
 */
export const migrateStorageData = async (newValue: boolean) => {
  try {
    const sourceStorage = newValue
      ? new Storage({ area: "local" })
      : new Storage({ area: "sync" })
    const targetStorage = newValue
      ? new Storage({ area: "sync" })
      : new Storage({ area: "local" })

    // Get all keys that need to be migrated
    // Note: This list should include all settings that should be synchronized
    const keysToMigrate = [
      "copilotSummaryPrompt",
      "copilotRephrasePrompt",
      "copilotTranslatePrompt",
      "copilotExplainPrompt",
      "copilotCustomPrompt",
      "copilotPromptsEnabled",
      "customCopilotPrompts",
      "defaultOCRLanguage",
      "titleGenEnabled",
      "titleGenerationPrompt",
      "titleGenerationModel",
      "chatWithWebsiteEmbedding",
      "maxWebsiteContext",
      "isMigrated",
      "urlRewriteEnabled",
      "ollamaEnabledStatus",
      "rewriteUrl",
      "copilotResumeLastChat",
      "webUIResumeLastChat",
      "sidebarOpen",
      "customOllamaHeaders",
      "openOnIconClick",
      "openOnRightClick",
      "totalFilePerKB",
      "noOfRetrievedDocs",
      "removeReasoningTagFromCopy",
      "sendNotificationAfterIndexing",
      "selectedModel",
      "chromeAIStatus",
      "ollamaURL",
      "askForModelSelectionEveryTime",
      "defaultModel",
      "systemPromptForNonRag",
      "systemPromptForRag",
      "questionPromptForRag",
      "systemPromptForNonRagOption",
      "sendWhenEnter",
      "defaultEmbeddingModel",
      "defaultEmbeddingChunkSize",
      "defaultSplittingStrategy",
      "defaultSplittingSeparator",
      "defaultEmbeddingChunkOverlap",
      "webSearchPrompt",
      "webSearchFollowUpPrompt",
      "pageShareUrl",
      "checkOllamaStatus",
      "isSimpleInternetSearch",
      "isVisitSpecificWebsite",
      "searchProvider",
      "totalSearchResults",
      "searxngURL",
      "searxngJSONMode",
      "defaultInternetSearchOn",
      "ttsProvider",
      "voice",
      "isTTSEnabled",
      "isSSMLEnabled",
      "elevenLabsApiKey",
      "elevenLabsVoiceId",
      "elevenLabsModel",
      "openAITTSBaseUrl",
      "openAITTSApiKey",
      "openAITTSModel",
      "openAITTSVoice",
      "ttsResponseSplitting",
      "isTTSAutoPlayEnabled",
      "speechPlaybackSpeed"
    ]

    // Migrate data
    for (const key of keysToMigrate) {
      const value = await sourceStorage.get(key)
      if (value !== undefined && value !== null) {
        await targetStorage.set(key, value)
      }
    }

    console.log(
      `Storage data migrated from ${newValue ? "local" : "sync"} to ${newValue ? "sync" : "local"}`
    )
  } catch (error) {
    console.error("Error migrating storage data:", error)
  }
}
