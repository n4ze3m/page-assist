import { importChatHistory, importPrompts } from "@/db"
import {
  exportChatHistory,
  exportModels,
  exportNicknames,
  exportOAIConfigs,
  exportPrompts,
  importChatHistoryV2,
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
export const exportPageAssistData = async () => {
  const knowledge = await exportKnowledge()
  const chat = await exportChatHistory()
  const vector = await exportVectors()
  const prompts = await exportPrompts()
  const oaiConfigs = await exportOAIConfigs()
  const nicknames = await exportNicknames()
  const models = await exportModels()

  const data = {
    knowledge,
    chat,
    vector,
    prompts,
    oaiConfigs,
    nicknames,
    models
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
export const importPageAssistData = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string)
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
            db.customModels
          ],
          async () => {
            if (data?.knowledge && Array.isArray(data.knowledge)) {
              await importKnowledgeV2(formatKnowledge(data?.knowledge), options)
            }

            if (data?.chat && Array.isArray(data.chat)) {
              await importChatHistoryV2(data.chat, options)
            }

            if (data?.vector && Array.isArray(data.vector)) {
              await importVectorsV2(formatVector(data.vector), options)
            }

            if (data?.prompts && Array.isArray(data.prompts)) {
              await importPromptsV2(data.prompts, options)
            }
            if (data?.oaiConfigs && Array.isArray(data.oaiConfigs)) {
              await importOAIConfigsV2(data.oaiConfigs, options)
            }

            if (data?.nicknames && Array.isArray(data.nicknames)) {
              await importNicknamesV2(data.nicknames, options)
            }

            if (data?.models && Array.isArray(data.models)) {
              await importModelsV2(data.models, options)
            }
          }
        )

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
