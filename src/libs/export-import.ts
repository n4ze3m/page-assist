import { importChatHistory, importPrompts } from "@/db"
import {
  exportChatHistory,
  exportMcpServers,
  exportModels,
  exportNicknames,
  exportOAIConfigs,
  exportPrompts,
  exportSessionFiles,
  exportUserSettings,
  generateID,
  getAllWebshares,
  getProjectFolders,
  importChatHistoryV2,
  importMcpServersV2,
  importModelsV2,
  importNicknamesV2,
  importOAIConfigsV2,
  importProjectFoldersV2,
  importPromptsV2,
  importSessionFilesV2,
  importUserSettingsV2,
  importWebsharesV2
} from "@/db/dexie/helpers"
import type { HistoryInfo, Message } from "@/db/dexie/types"
import { exportKnowledge, importKnowledgeV2 } from "@/db/dexie/knowledge"
import { exportMemories, importMemoriesV2 } from "@/db/dexie/memory"
import { exportModelStates, importModelStatesV2 } from "@/db/dexie/modelState"
import {
  exportProviderStates,
  importProviderStatesV2
} from "@/db/dexie/providerState"
import { db } from "@/db/dexie/schema"
import { exportVectors, importVectorsV2 } from "@/db/dexie/vector"
import { importKnowledge } from "@/db/knowledge"
import { importVectors } from "@/db/vector"
import { getStorageSyncEnabled } from "@/services/app"

export const formatKnowledge = (knowledge: any[]) => {
  const kb = []
  for (const k of knowledge) {
    if (Array.isArray(k)) {
      kb.push(...formatKnowledge(k))
    } else {
      if (k?.db_type === "knowledge") {
        kb.push(k)
      }
    }
  }

  return kb
}
export const formatVector = (vector: any[]) => {
  const vec = []
  for (const v of vector) {
    if (Array.isArray(v)) {
      vector.push(...formatVector(v))
    } else {
      if (v?.vectors) {
        vec.push(v)
      }
    }
  }
  return vec
}
export type ExportSection =
  | "knowledge"
  | "chat"
  | "projectFolders"
  | "sessionFiles"
  | "vector"
  | "prompts"
  | "memories"
  | "oaiConfigs"
  | "nicknames"
  | "models"
  | "modelState"
  | "providerState"
  | "mcpServers"
  | "webshares"
  | "storageLocal"
  | "storageSync"

export const ALL_EXPORT_SECTIONS: ExportSection[] = [
  "knowledge",
  "chat",
  "projectFolders",
  "sessionFiles",
  "vector",
  "prompts",
  "memories",
  "oaiConfigs",
  "nicknames",
  "models",
  "modelState",
  "providerState",
  "mcpServers",
  "webshares",
  "storageLocal",
  "storageSync"
]

export const exportPageAssistData = async (
  sections: ExportSection[] = ALL_EXPORT_SECTIONS
) => {
  const wants = (s: ExportSection) => sections.includes(s)
  const data: Record<string, any> = {}

  if (wants("knowledge")) data.knowledge = await exportKnowledge()
  if (wants("chat")) data.chat = await exportChatHistory()
  if (wants("projectFolders")) data.projectFolders = await getProjectFolders()
  if (wants("sessionFiles")) data.sessionFiles = await exportSessionFiles()
  if (wants("vector")) data.vector = await exportVectors()
  if (wants("prompts")) data.prompts = await exportPrompts()
  if (wants("memories")) data.memories = await exportMemories()
  if (wants("oaiConfigs")) data.oaiConfigs = await exportOAIConfigs()
  if (wants("nicknames")) data.nicknames = await exportNicknames()
  if (wants("models")) data.models = await exportModels()
  if (wants("modelState")) data.modelState = await exportModelStates()
  if (wants("providerState")) data.providerState = await exportProviderStates()
  if (wants("mcpServers")) data.mcpServers = await exportMcpServers()
  if (wants("webshares")) {
    data.webshares = await getAllWebshares()
    // holds the owner id needed to delete these share links later
    data.userSettings = await exportUserSettings()
  }

  if (wants("storageLocal")) {
    data.storageLocal = await browser.storage.local.get()
  }

  if (wants("storageSync")) {
    const storageSyncEnabled = await getStorageSyncEnabled()
    data.storageSync = storageSyncEnabled
      ? await browser.storage.sync.get()
      : {}
  }

  const dataStr = JSON.stringify(data, null, 2)

  const blob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `page-assist-${new Date().toISOString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Detect a single-chat JSON download from the chat "More options" menu
 * (a top-level array of UI messages carrying `isBot` and `message`).
 */
export const isChatMessagesExport = (data: any): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false
  return data.every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.isBot === "boolean" &&
      typeof entry.message === "string"
  )
}

/**
 * Convert a single-chat JSON download into the Page Assist import shape
 * (`{ chat: [{ history, messages }] }`) so it flows through the existing
 * import pipeline. Fresh ids are generated to avoid colliding with chats
 * already in the database.
 */
export const convertChatMessagesToPageAssist = (
  data: any[]
): { chat: { history: HistoryInfo; messages: Message[] }[] } => {
  const historyId = generateID()
  const createdAt = Date.now()

  const title =
    data
      .find((m) => !m.isBot && m.message?.trim())
      ?.message?.trim()
      ?.slice(0, 50) || "Imported Chat"

  const history: HistoryInfo = {
    id: historyId,
    title,
    is_rag: false,
    message_source: "web-ui",
    createdAt
  }

  const messages: Message[] = data.map((m, index) => ({
    id: generateID(),
    history_id: historyId,
    name: m.name || m.modelName || "",
    role:
      m.messageKind === "tool_result" ? "tool" : m.isBot ? "assistant" : "user",
    content: m.message ?? "",
    images: Array.isArray(m.images) ? m.images : [],
    sources: Array.isArray(m.sources) ? m.sources : [],
    search: m.search,
    createdAt: createdAt + index,
    messageType: m.messageType,
    messageKind: m.messageKind,
    toolCalls: m.toolCalls,
    toolCallId: m.toolCallId,
    toolName: m.toolName,
    toolServerName: m.toolServerName,
    toolError: m.toolError,
    generationInfo: m.generationInfo,
    reasoning_time_taken: m.reasoning_time_taken,
    modelName: m.modelName,
    modelImage: m.modelImage,
    documents: m.documents
  }))

  return { chat: [{ history, messages }] }
}

export const parseImportFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string))
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export const getAvailableImportSections = (
  data: any
): Partial<Record<ExportSection, number>> => {
  const counts: Partial<Record<ExportSection, number>> = {}

  if (Array.isArray(data?.knowledge)) {
    counts.knowledge = formatKnowledge(data.knowledge).length
  }
  if (Array.isArray(data?.chat)) counts.chat = data.chat.length
  if (Array.isArray(data?.projectFolders)) {
    counts.projectFolders = data.projectFolders.length
  }
  if (Array.isArray(data?.sessionFiles)) {
    counts.sessionFiles = data.sessionFiles.length
  }
  if (Array.isArray(data?.vector)) {
    counts.vector = formatVector(data.vector).length
  }
  if (Array.isArray(data?.prompts)) counts.prompts = data.prompts.length
  if (Array.isArray(data?.memories)) counts.memories = data.memories.length
  if (Array.isArray(data?.oaiConfigs)) counts.oaiConfigs = data.oaiConfigs.length
  if (Array.isArray(data?.nicknames)) counts.nicknames = data.nicknames.length
  if (Array.isArray(data?.models)) counts.models = data.models.length
  if (Array.isArray(data?.modelState)) {
    counts.modelState = data.modelState.length
  }
  if (Array.isArray(data?.providerState)) {
    counts.providerState = data.providerState.length
  }
  if (Array.isArray(data?.mcpServers)) counts.mcpServers = data.mcpServers.length
  if (Array.isArray(data?.webshares)) counts.webshares = data.webshares.length
  if (data?.storageLocal && typeof data.storageLocal === "object") {
    counts.storageLocal = Object.keys(data.storageLocal).length
  }
  if (data?.storageSync && typeof data.storageSync === "object") {
    counts.storageSync = Object.keys(data.storageSync).length
  }

  return counts
}

export const importPageAssistDataFromObject = async (
  data: any,
  sections: ExportSection[] = ALL_EXPORT_SECTIONS
) => {
  const wants = (s: ExportSection) => sections.includes(s)
  const options = {}

  await db.transaction(
    "rw",
    [
      db.chatHistories,
      db.messages,
      db.prompts,
      db.knowledge,
      db.vectors,
      db.sessionFiles,
      db.openaiConfigs,
      db.modelNickname,
      db.customModels,
      db.mcpServers,
      db.projectFolders,
      db.memories,
      db.modelState,
      db.providerState,
      db.webshares,
      db.userSettings
    ],
    async () => {
      if (
        wants("knowledge") &&
        data?.knowledge &&
        Array.isArray(data.knowledge)
      ) {
        await importKnowledgeV2(formatKnowledge(data?.knowledge), options)
      }

      if (wants("chat") && data?.chat && Array.isArray(data.chat)) {
        await importChatHistoryV2(data.chat, options)
      }

      if (
        wants("projectFolders") &&
        data?.projectFolders &&
        Array.isArray(data.projectFolders)
      ) {
        await importProjectFoldersV2(data.projectFolders, options)
      }

      if (
        wants("sessionFiles") &&
        data?.sessionFiles &&
        Array.isArray(data.sessionFiles)
      ) {
        await importSessionFilesV2(data.sessionFiles, options)
      }

      if (wants("vector") && data?.vector && Array.isArray(data.vector)) {
        await importVectorsV2(formatVector(data.vector), options)
      }

      if (wants("prompts") && data?.prompts && Array.isArray(data.prompts)) {
        await importPromptsV2(data.prompts, options)
      }

      if (wants("memories") && data?.memories && Array.isArray(data.memories)) {
        await importMemoriesV2(data.memories, options)
      }
      if (
        wants("oaiConfigs") &&
        data?.oaiConfigs &&
        Array.isArray(data.oaiConfigs)
      ) {
        await importOAIConfigsV2(data.oaiConfigs, options)
      }

      if (
        wants("nicknames") &&
        data?.nicknames &&
        Array.isArray(data.nicknames)
      ) {
        await importNicknamesV2(data.nicknames, options)
      }

      if (wants("models") && data?.models && Array.isArray(data.models)) {
        await importModelsV2(data.models, options)
      }

      if (
        wants("modelState") &&
        data?.modelState &&
        Array.isArray(data.modelState)
      ) {
        await importModelStatesV2(data.modelState, options)
      }

      if (
        wants("providerState") &&
        data?.providerState &&
        Array.isArray(data.providerState)
      ) {
        await importProviderStatesV2(data.providerState, options)
      }

      if (
        wants("mcpServers") &&
        data?.mcpServers &&
        Array.isArray(data.mcpServers)
      ) {
        await importMcpServersV2(data.mcpServers, options)
      }

      if (
        wants("webshares") &&
        data?.webshares &&
        Array.isArray(data.webshares)
      ) {
        // before webshares: the owner id is only adopted while this device has none
        if (Array.isArray(data?.userSettings)) {
          await importUserSettingsV2(data.userSettings)
        }
        await importWebsharesV2(data.webshares, options)
      }
    }
  )

  if (
    wants("storageLocal") &&
    data?.storageLocal &&
    typeof data.storageLocal === "object"
  ) {
    await browser.storage.local.set(data.storageLocal)
  }

  if (wants("storageSync")) {
    const storageSyncEnabled = await getStorageSyncEnabled()
    if (
      storageSyncEnabled &&
      data?.storageSync &&
      typeof data.storageSync === "object"
    ) {
      await browser.storage.sync.set(data.storageSync)
    }
  }
}

export const importPageAssistData = async (
  file: File,
  sections: ExportSection[] = ALL_EXPORT_SECTIONS
) => {
  const data = await parseImportFile(file)
  await importPageAssistDataFromObject(data, sections)
}

// @deprecated don't use this
export const importPageAssistDataOld = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string)

        if (data?.knowledge) {
          await importKnowledge(data.knowledge)
        }

        if (data?.chat) {
          await importChatHistory(data.chat)
        }

        if (data?.vector) {
          await importVectors(data.vector)
        }

        if (data?.prompts) {
          await importPrompts(data.prompts)
        }

        resolve(true)
      } catch (e) {
        console.error(e)
        reject(e)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
