import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { searchWebForAgent } from "@/web/web"

export const createWebSearchTool = () => {
  return new DynamicStructuredTool({
    name: "page_assist_web_search",
    description: `Search the internet for up-to-date information. Use this whenever the user asks about recent events, current data, or anything that may not be in your training data. Returns a numbered list of results with URL and snippet. Follow up with \`page_assist_web_fetch\` when you need the full content of a specific result. Current date and time: ${new Date().toLocaleString()}.`,
    schema: z.object({
      query: z
        .string()
        .min(1)
        .describe("The search query to send to the configured search provider.")
    }),
    func: async ({ query }) => {
      const { answer, results } = await searchWebForAgent(query)

      if (results.length === 0 && !answer) {
        return `No search results found for "${query}". Try a different query.`
      }

      const sections: string[] = [`Search results for "${query}":`]

      if (answer) {
        sections.push(`Direct answer: ${answer}`)
      }

      if (results.length > 0) {
        const formatted = results
          .map(
            (result, idx) =>
              `[${idx + 1}] ${result.hostname || result.url}\nURL: ${result.url}\n${result.content}`
          )
          .join("\n\n")
        sections.push(formatted)
      }

      return sections.join("\n\n")
    }
  })
}
