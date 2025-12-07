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
  importPromptsV2
} from "@/db/dexie/helpers"
import { db } from "@/db/dexie/schema"

export const exportPageAssistData = async () => {
  const chat = await exportChatHistory()
  const prompts = await exportPrompts()
  const oaiConfigs = await exportOAIConfigs()
  const nicknames = await exportNicknames()
  const models = await exportModels()

  const data = {
    chat,
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
            db.sessionFiles,
            db.modelNickname,
            db.customModels
          ],
          async () => {
            if (data?.chat && Array.isArray(data.chat)) {
              await importChatHistoryV2(data.chat, options)
            }

            if (data?.prompts && Array.isArray(data.prompts)) {
              await importPromptsV2(data.prompts, options)
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

        if (data?.chat) {
          await importChatHistory(data.chat)
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
