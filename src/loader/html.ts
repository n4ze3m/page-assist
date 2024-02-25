import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
import { compile } from "html-to-text"
import { chromeRunTime } from "~libs/runtime"

export interface WebLoaderParams {
  html: string
  url: string
}

export class PageAssistHtmlLoader
  extends BaseDocumentLoader
  implements WebLoaderParams {
  html: string
  url: string

  constructor({ html, url }: WebLoaderParams) {
    super()
    this.html = html
    this.url = url
  }

  async load(): Promise<Document<Record<string, any>>[]> {
    const htmlCompiler = compile({
      wordwrap: false
    })
    const text = htmlCompiler(this.html)
    const metadata = { source: this.url }
    return [new Document({ pageContent: text, metadata })]
  }

  async loadByURL(): Promise<Document<Record<string, any>>[]> {
    await chromeRunTime(this.url)
    const fetchHTML = await fetch(this.url)
    const html = await fetchHTML.text()
    const htmlCompiler = compile({
      wordwrap: false,
      selectors: [
        { selector: "img", format: "skip" },
        { selector: "script", format: "skip" }
      ]
    })
    const text = htmlCompiler(html)
    const metadata = { url: this.url }
    return [new Document({ pageContent: text, metadata })]
  }
}
