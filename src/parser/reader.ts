import { Readability } from "@mozilla/readability"
import { defaultExtractContent } from "./default"
export const extractReadabilityContent = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0"
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  const html = await response.text()

  const doc = new DOMParser().parseFromString(html, "text/html")
  const reader = new Readability(doc)
  const article = reader.parse()

  const markdown = defaultExtractContent(article.content)
  return markdown
}
