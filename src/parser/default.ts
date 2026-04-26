import Defuddle, { createMarkdownContent } from "defuddle/full"

export const defaultExtractContent = (html: string, url: string = "") => {
  if (!html) return ""

  try {
    const doc = new DOMParser().parseFromString(html, "text/html")

    const result = new Defuddle(doc as unknown as Document, { url }).parse()

    if (result?.content && result.content.trim().length > 0) {
      return createMarkdownContent(result.content, url).trim()
    }
  } catch (error) {
    console.warn(
      "[defaultExtractContent] defuddle extraction failed, falling back:",
      error
    )
  }

  try {
    const doc = new DOMParser().parseFromString(html, "text/html")
    doc
      .querySelectorAll("script, style, link, noscript, svg, [aria-hidden=\"true\"]")
      .forEach((el) => el.remove())
    const body =
      doc.querySelector("[role=\"main\"]") ||
      doc.querySelector("main") ||
      doc.querySelector("article") ||
      doc.body
    return createMarkdownContent(body?.innerHTML || html, url).trim()
  } catch (error) {
    console.warn(
      "[defaultExtractContent] fallback markdown conversion failed:",
      error
    )
    return ""
  }
}
