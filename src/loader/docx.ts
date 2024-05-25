import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
import * as mammoth from "mammoth"

export interface WebLoaderParams {
    fileName: string
    buffer: ArrayBuffer
}

export class PageAssistDocxLoader
    extends BaseDocumentLoader
    implements WebLoaderParams {
    fileName: string
    buffer: ArrayBuffer

    constructor({ fileName, buffer }: WebLoaderParams) {
        super()
        this.fileName = fileName
        this.buffer = buffer
    }

    public async load(): Promise<Document[]> {
        const data = await mammoth.extractRawText({
            arrayBuffer: this.buffer
        })
        const text = data.value
        const meta = { source: this.fileName }
        if (text) {
            return [new Document({ pageContent: text, metadata: meta })]
        }
        return []
    }
}
