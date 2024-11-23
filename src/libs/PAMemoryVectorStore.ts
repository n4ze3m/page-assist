
import { similarity as ml_distance_similarity } from "ml-distance"
import { VectorStore } from "@langchain/core/vectorstores"
import type { EmbeddingsInterface } from "@langchain/core/embeddings"
import { Document, DocumentInterface } from "@langchain/core/documents"
import { rerankDocs } from "../utils/rerank"

interface MemoryVector {
    content: string
    embedding: number[]
    metadata: Record<string, any>
}

interface MemoryVectorStoreArgs {
    similarity?: typeof ml_distance_similarity.cosine
}

export class PAMemoryVectorStore extends VectorStore {


    declare FilterType: (doc: Document) => boolean

    private memoryVectors: MemoryVector[] = []
    private similarity: typeof ml_distance_similarity.cosine

    constructor(embeddings: EmbeddingsInterface, args?: MemoryVectorStoreArgs) {
        super(embeddings, args)
        this.similarity = args?.similarity ?? ml_distance_similarity.cosine
    }

    _vectorstoreType(): string {
        return "memory"
    }

    async addVectors(vectors: number[][], documents: DocumentInterface[], options?: { [x: string]: any }): Promise<void> {
        const memoryVectors = documents.map((doc, index) => ({
            content: doc.pageContent,
            embedding: vectors[index],
            metadata: doc.metadata
        }))

        this.memoryVectors.push(...memoryVectors)
    }
    similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[DocumentInterface, number][]> {
        throw new Error("Method not implemented.")
    }

    async addDocuments(documents: Document[]): Promise<void> {
        const texts = documents.map((doc) => doc.pageContent)
        const embeddings = await this.embeddings.embedDocuments(texts)
        await this.addVectors(embeddings, documents)
    }

    async similaritySearch(query: string, k = 4): Promise<Document[]> {
        const queryEmbedding = await this.embeddings.embedQuery(query)

        const similarities = this.memoryVectors.map((vector) => ({
            similarity: this.similarity(queryEmbedding, vector.embedding),
            document: vector
        }))

        similarities.sort((a, b) => b.similarity - a.similarity)
        const topK = similarities.slice(0, k)

        const docs = topK.map(({ document }) =>
            new Document({
                pageContent: document.content,
                metadata: document.metadata
            })
        )

        return docs
    }

    async similaritySearchWithScore(query: string, k = 4): Promise<[Document, number][]> {
        const queryEmbedding = await this.embeddings.embedQuery(query)

        const similarities = this.memoryVectors.map((vector) => ({
            similarity: this.similarity(queryEmbedding, vector.embedding),
            document: vector
        }))

        similarities.sort((a, b) => b.similarity - a.similarity)
        const topK = similarities.slice(0, k)

        return topK.map(({ document, similarity }) => [
            new Document({
                pageContent: document.content,
                metadata: document.metadata
            }),
            similarity
        ])
    }

    static async fromDocuments(
        docs: Document[],
        embeddings: EmbeddingsInterface,
        args?: MemoryVectorStoreArgs
    ): Promise<PAMemoryVectorStore> {
        const store = new PAMemoryVectorStore(embeddings, args)
        await store.addDocuments(docs)
        return store
    }
}
