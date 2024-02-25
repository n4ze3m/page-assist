import { getWebSearchPrompt } from "~services/ollama"
import { webSearch } from "./local-google"

export const getSystemPromptForWeb = async (query: string) => {
    try {
        const search = await webSearch(query)

        const search_results = search.map((result, idx) => `<result source="${result.url}" id="${idx}">${result.content}</result>`).join("\n")

        const current_date_time = new Date().toLocaleString()

        const system = await getWebSearchPrompt();

        const prompt = system.replace("{current_date_time}", current_date_time).replace("{search_results}", search_results)

        return {
            prompt,
            source: search.map((result) => {
                return {
                    url: result.url,
                    name: new URL(result.url).hostname,
                    type: "url",
                }
            })
        }
    } catch (e) {
        console.error(e)
        return {
            prompt: "",
            source: [],
        }
    }
}