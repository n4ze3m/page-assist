import { SystemMessage } from "@langchain/core/messages"
import { getSelectedModelName } from "./model"

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

  return new SystemMessage({
    content: content
  })
}
