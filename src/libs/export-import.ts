import { importChatHistory, importPrompts } from "@/db"
import {
  exportChatHistory,
  exportMcpServers,
  exportModels,
  exportNicknames,
  exportOAIConfigs,
  exportPrompts,
  importChatHistoryV2,
  importMcpServersV2,
  importModelsV2,
  importNicknamesV2,
  importOAIConfigsV2,
  importPromptsV2
} from "@/db/dexie/helpers"
import { exportKnowledge, importKnowledgeV2 } from "@/db/dexie/knowledge"
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
  | "vector"
  | "prompts"
  | "oaiConfigs"
  | "nicknames"
  | "models"
  | "mcpServers"
  | "storageLocal"
  | "storageSync"

export const ALL_EXPORT_SECTIONS: ExportSection[] = [
  "knowledge",
  "chat",
  "vector",
  "prompts",
  "oaiConfigs",
  "nicknames",
  "models",
  "mcpServers",
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
  if (wants("vector")) data.vector = await exportVectors()
  if (wants("prompts")) data.prompts = await exportPrompts()
  if (wants("oaiConfigs")) data.oaiConfigs = await exportOAIConfigs()
  if (wants("nicknames")) data.nicknames = await exportNicknames()
  if (wants("models")) data.models = await exportModels()
  if (wants("mcpServers")) data.mcpServers = await exportMcpServers()

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
  if (Array.isArray(data?.vector)) {
    counts.vector = formatVector(data.vector).length
  }
  if (Array.isArray(data?.prompts)) counts.prompts = data.prompts.length
  if (Array.isArray(data?.oaiConfigs)) counts.oaiConfigs = data.oaiConfigs.length
  if (Array.isArray(data?.nicknames)) counts.nicknames = data.nicknames.length
  if (Array.isArray(data?.models)) counts.models = data.models.length
  if (Array.isArray(data?.mcpServers)) counts.mcpServers = data.mcpServers.length
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
      db.mcpServers
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

      if (wants("vector") && data?.vector && Array.isArray(data.vector)) {
        await importVectorsV2(formatVector(data.vector), options)
      }

      if (wants("prompts") && data?.prompts && Array.isArray(data.prompts)) {
        await importPromptsV2(data.prompts, options)
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
        wants("mcpServers") &&
        data?.mcpServers &&
        Array.isArray(data.mcpServers)
      ) {
        await importMcpServersV2(data.mcpServers, options)
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
