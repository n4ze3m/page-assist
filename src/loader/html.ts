import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
import { compile } from "html-to-text"
import { chromeRunTime } from "~libs/runtime"

const isPDFFetch = async (url: string) => {
  await chromeRunTime(url)
  const response = await fetch(url)
  const blob = await response.blob()
  return blob.type === "application/pdf"
}
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
