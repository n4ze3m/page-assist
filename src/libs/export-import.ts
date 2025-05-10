import {
  exportChatHistory,
  exportPrompts,
  importChatHistory,
  importPrompts
} from "@/db"
import { exportKnowledge, importKnowledge } from "@/db/knowledge"
import { exportVectors, importVectors } from "@/db/vector"
import { notification } from "antd"

export const exportPageAssistData = async () => {
  const knowledge = await exportKnowledge()
  const chat = await exportChatHistory()
  const vector = await exportVectors()
  const prompts = await exportPrompts()

  const data = {
    knowledge,
    chat,
    vector,
    prompts
  }

  const dataStr = JSON.stringify(data)

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
