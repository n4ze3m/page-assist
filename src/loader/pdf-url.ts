import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
import { processPdf } from "@/libs/pdf"
export interface WebLoaderParams {
  url: string
  name: string
}

export class PageAssistPDFUrlLoader
  extends BaseDocumentLoader
  implements WebLoaderParams
{
  pdf: { content: string; page: number }[]
  url: string
  name: string

  constructor({ url, name }: WebLoaderParams) {
    super()
    this.url = url
    this.name = name
  }

  async load(): Promise<Document<Record<string, any>>[]> {
    const documents: Document[] = []

    const data = await processPdf(this.url)

    for (let i = 1; i <= data.numPages; i += 1) {
      const page = await data.getPage(i)
      const content = await page.getTextContent()

      if (content?.items.length === 0) {
        continue
      }

      const text = content?.items
        .map((item: any) => item.str)
        .join("\n")
        .replace(/\x00/g, "")
        .trim()
      documents.push({
        pageContent: text,
        metadata: { source: this.name, page: i, type: "pdf" }
      })
    }

    return documents
  }
}
