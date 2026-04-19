import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { PageAssistHtmlLoader } from "@/loader/html"
import { getMaxContextSize } from "@/services/kb"

export const createWebFetchTool = () => {
  return new DynamicStructuredTool({
    name: "page_assist_web_fetch",
    description:
      "Fetch the full readable content of a single web page or YouTube transcript by URL. Use this after `page_assist_web_search` when the snippet is not enough, or when the user shares a URL they want analyzed. Content is truncated to the configured maximum context size.",
    schema: z.object({
      url: z
        .string()
        .url()
        .describe("The absolute URL (https://...) of the page to fetch.")
    }),
    func: async ({ url }) => {
      const loader = new PageAssistHtmlLoader({ html: "", url })
      const docs = await loader.loadByURL()

      if (!docs || docs.length === 0) {
        return `Failed to fetch content from ${url}.`
      }

      const maxContextSize = await getMaxContextSize()
      const content = docs
        .map((doc) => doc.pageContent)
        .join("\n\n")
        .slice(0, maxContextSize)

      if (!content.trim()) {
        return `The page at ${url} returned no readable content.`
      }

      return `Content from ${url}:\n\n${content}`
    }
  })
}
