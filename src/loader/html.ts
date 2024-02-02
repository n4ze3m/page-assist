import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "langchain/document"
import { compile } from "html-to-text"

export interface WebLoaderParams {
  html: string
  url: string
}

export class PageAssistHtmlLoader
  extends BaseDocumentLoader
  implements WebLoaderParams
{
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
}
