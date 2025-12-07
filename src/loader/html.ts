import type { Document } from "@/types/document"

interface PageAssistHtmlLoaderOptions {
  html: string
  url: string
}

/**
 * Simple HTML loader that extracts text content from HTML documents.
 * Used for web search result processing.
 */
export class PageAssistHtmlLoader {
  private html: string
  private url: string

  constructor(options: PageAssistHtmlLoaderOptions) {
    this.html = options.html
    this.url = options.url
  }

  async load(): Promise<Document[]> {
    const parser = new DOMParser()
    const doc = parser.parseFromString(this.html, "text/html")

    // Remove scripts, styles, and other non-content elements
    const elementsToRemove = doc.querySelectorAll(
      "script, style, noscript, iframe, nav, footer, header, aside"
    )
    elementsToRemove.forEach((el) => el.remove())

    // Get text content
    const textContent = doc.body?.textContent || ""
    const cleanedText = textContent
      .replace(/\s+/g, " ")
      .trim()

    if (!cleanedText) {
      return []
    }

    return [
      {
        pageContent: cleanedText,
        metadata: {
          url: this.url,
          title: doc.title || ""
        }
      }
    ]
  }

  async loadByURL(): Promise<Document[]> {
    try {
      const abortController = new AbortController()
      setTimeout(() => abortController.abort(), 10000)

      const response = await fetch(this.url, {
        signal: abortController.signal,
        headers: {
          "User-Agent": navigator.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      })

      if (!response.ok) {
        return []
      }

      const html = await response.text()
      this.html = html
      return this.load()
    } catch (error) {
      console.error(`Failed to load URL ${this.url}:`, error)
      return []
    }
  }
}
