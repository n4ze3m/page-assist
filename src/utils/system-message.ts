import { SystemMessage } from "@langchain/core/messages"

export const systemPromptFormatter = ({ content }: { content: string }) => {
  const currentDate = new Date()
  const replacements = {
    "{current_date_time}": currentDate.toLocaleString(),
    "{current_year}": currentDate.getFullYear().toString(),
    "{current_month}": currentDate.getMonth().toString(),
    "{current_day}": currentDate.getDate().toString(),
    "{current_hour}": currentDate.getHours().toString(),
    "{current_minute}": currentDate.getMinutes().toString()
  }

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(key, value)
  }

  return new SystemMessage({
    content: content
  })
}
