import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
export interface WebLoaderParams {
  pdf: { content: string; page: number }[]
  url: string
}

export class PageAssistPDFLoader
  extends BaseDocumentLoader
  implements WebLoaderParams
{
  pdf: { content: string; page: number }[]
  url: string

  constructor({ pdf, url }: WebLoaderParams) {
    super()
    this.pdf = pdf
    this.url = url
  }

  async load(): Promise<Document<Record<string, any>>[]> {
    const documents: Document[] = []

    for (const page of this.pdf) {
      const metadata = { source: this.url, page: page.page }
      documents.push(new Document({ pageContent: page.content, metadata }))
    }

    return [
      new Document({
        pageContent: documents.map((doc) => doc.pageContent).join("\n\n"),
        metadata: documents.map((doc) => doc.metadata)
      })
    ]
  }
}
