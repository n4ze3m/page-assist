import { SystemMessage } from "@langchain/core/messages"
import { getSelectedModelName } from "./model"
import { Storage } from "@plasmohq/storage"
import { getMemoriesAsContext } from "@/db/dexie/memory"

const storage = new Storage()

export const systemPromptFormatter = async ({ content }: { content: string }) => {
  const currentDate = new Date()
  const model = await getSelectedModelName()
  const replacements = {
    "{current_date_time}": currentDate.toLocaleString(),
    "{current_year}": currentDate.getFullYear().toString(),
    "{current_month}": currentDate.getMonth().toString(),
    "{current_day}": currentDate.getDate().toString(),
    "{current_hour}": currentDate.getHours().toString(),
    "{current_minute}": currentDate.getMinutes().toString(),
    "{model}": model,
    "{model_name}": model,
  }

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(key, value)
  }

  // Check if memory is enabled
  const enableMemory = await storage.get("enableMemory")

  if (enableMemory) {
    const memoryContext = await getMemoriesAsContext()
    if (memoryContext) {
      content = `${content}\n\n${memoryContext}`
    }
  }

  return new SystemMessage({
    content: content
  })
}
