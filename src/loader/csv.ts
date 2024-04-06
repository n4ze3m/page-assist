import { dsvFormat } from "d3-dsv"

import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
export interface WebLoaderParams {
  url: string
  name: string
  options: {
    column?: string
    separator?: string
  }
}

export class PageAssisCSVUrlLoader
  extends BaseDocumentLoader
  implements WebLoaderParams
{
  pdf: { content: string; page: number }[]
  url: string
  name: string
  options: { column?: string; separator?: string }

  constructor({ url, name }: WebLoaderParams) {
    super()
    this.url = url
    this.name = name
    this.options = {}
  }

  public async parse(raw: string): Promise<string[]> {
    const { column, separator = "," } = this.options
    const psv = dsvFormat(separator)

    let parsed = psv.parseRows(raw.trim())

    if (column !== undefined) {
      if (!parsed[0].includes(column)) {
        throw new Error(`ColumnNotFoundError: Column ${column} not found`)
      }

      const columnIndex = parsed[0].indexOf(column)
      return parsed.map((row) => row[columnIndex]!)
    }

    const headers = parsed[0]
    parsed = parsed.slice(1)

    return parsed.map((row) =>
      row.map((value, index) => `${headers[index]}: ${value}`).join("\n")
    )
  }
  async load(): Promise<Document<Record<string, any>>[]> {
    const res = await fetch(this.url)

    if (!res.ok) {
      throw new Error(`Failed to fetch ${this.url}`)
    }

    const raw = await res.text()

    const parsed = await this.parse(raw)
    let metadata = { source: this.name, type: "csv" }
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
