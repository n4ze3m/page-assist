import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { PageAssistHtmlLoader } from "@/loader/html"
import { getMaxContextSize } from "@/services/kb"
import { assertSafeFetchUrl } from "@/utils/safe-fetch-url"

export const createWebFetchTool = () => {
  return new DynamicStructuredTool({
    name: "page_assist_web_fetch",
    description:
      "Fetch the full readable content of a single web page or YouTube transcript by URL. Use this after `page_assist_web_search` when the snippet is not enough, or when the user shares a URL they want analyzed. Content is truncated to the configured maximum context size.",
    schema: z.object({
      url: z
        .string()
        .url()
        .refine((value) => {
          try {
            const protocol = new URL(value).protocol
            return protocol === "http:" || protocol === "https:"
          } catch {
            return false
          }
        }, "Only http: and https: URLs are allowed.")
        .describe("The absolute http(s) URL of the page to fetch.")
    }),
    func: async ({ url }) => {
      const safety = assertSafeFetchUrl(url)
      if (!safety.ok) {
        return safety.reason
      }
      const loader = new PageAssistHtmlLoader({ html: "", url: safety.url.toString() })
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
