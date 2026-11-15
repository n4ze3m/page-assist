import { SystemMessage } from "@langchain/core/messages"
import { getSelectedModelName } from "./model"

const PAGE_VARIABLES = ["{page_title}", "{page_url}"]

// Title and URL of the active tab. Empty when it is not a normal web page
// (e.g. the Web UI itself or a browser internal page).
const getActivePageInfo = async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const tab = tabs?.[0]
    const url = tab?.url || ""
    if (!/^(https?|file):/i.test(url)) {
      return { title: "", url: "" }
    }
    return { title: tab?.title || "", url }
  } catch (e) {
    return { title: "", url: "" }
  }
}

export const systemPromptFormatter = async ({ content }: { content: string }) => {
  const currentDate = new Date()
  const model = await getSelectedModelName()
  const replacements: Record<string, string> = {
    "{current_date_time}": currentDate.toLocaleString(),
    "{current_year}": currentDate.getFullYear().toString(),
    "{current_month}": currentDate.getMonth().toString(),
    "{current_day}": currentDate.getDate().toString(),
    "{current_hour}": currentDate.getHours().toString(),
    "{current_minute}": currentDate.getMinutes().toString(),
    "{model}": model,
    "{model_name}": model,
  }

  // only look at the active tab when the prompt actually asks for it
  if (PAGE_VARIABLES.some((key) => content.includes(key))) {
    const page = await getActivePageInfo()
    replacements["{page_title}"] = page.title
    replacements["{page_url}"] = page.url
  }

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(key, value)
  }

  return new SystemMessage({
    content: content
  })
}
