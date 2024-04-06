import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
export interface WebLoaderParams {
  url: string
  name: string
}

export class PageAssisTXTUrlLoader
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

  public async parse(raw: string): Promise<string[]> {
    return [raw]
  }
  async load(): Promise<Document<Record<string, any>>[]> {
    const res = await fetch(this.url)

    if (!res.ok) {
      throw new Error(`Failed to fetch ${this.url}`)
    }

    const raw = await res.text()

    const parsed = await this.parse(raw)
    let metadata = { source: this.name, type: "txt" }
    parsed.forEach((pageContent, i) => {
      if (typeof pageContent !== "string") {
        throw new Error(
          `Expected string, at position ${i} got ${typeof pageContent}`
        )
      }
    })
    return parsed.map(
      (pageContent, i) =>
        new Document({
          pageContent,
          metadata:
            parsed.length === 1
              ? metadata
              : {
                  ...metadata,
                  line: i + 1
                }
        })
    )
  }
}
