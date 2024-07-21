import { Readability, } from "@mozilla/readability"
import { defaultExtractContent } from "./default"
export const extractReadabilityContent = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`)
    }

    const html = await response.text()

    // create a fake dom for Readability
    const doc = new DOMParser().parseFromString(html, "text/html")
    const reader = new Readability(doc)
    const article = reader.parse()

    // convert the article to markdown
    const markdown = defaultExtractContent(article.content)
    return markdown
}