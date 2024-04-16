import { getKnowledgeById, updateKnowledgeStatus } from "@/db/knowledge"
import { PageAssistPDFUrlLoader } from "@/loader/pdf-url"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize
} from "@/services/ollama"
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { PageAssistVectorStore } from "./PageAssistVectorStore"
import { PageAssisCSVUrlLoader } from "@/loader/csv"
import { PageAssisTXTUrlLoader } from "@/loader/txt"

export const processKnowledge = async (msg: any, id: string): Promise<void> => {
  console.log(`Processing knowledge with id: ${id}`)
  try {
    const knowledge = await getKnowledgeById(id)

    if (!knowledge) {
      console.error(`Knowledge with id ${id} not found`)
      return
    }

    await updateKnowledgeStatus(id, "processing")

    const ollamaEmbedding = new OllamaEmbeddings({
      model: knowledge.embedding_model
    })
    const chunkSize = await defaultEmbeddingChunkSize()
    const chunkOverlap = await defaultEmbeddingChunkOverlap()
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap
    })

    for (const doc of knowledge.source) {
      if (doc.type === "pdf" || doc.type === "application/pdf") {
        const loader = new PageAssistPDFUrlLoader({
          name: doc.filename,
          url: doc.content
        })
        let docs = await loader.load()
        const chunks = await textSplitter.splitDocuments(docs)
        await PageAssistVectorStore.fromDocuments(chunks, ollamaEmbedding, {
          knownledge_id: knowledge.id,
          file_id: doc.source_id
        })
      } else if (doc.type === "csv" || doc.type === "text/csv") {
        const loader = new PageAssisCSVUrlLoader({
          name: doc.filename,
          url: doc.content,
          options: {}
        })

        let docs = await loader.load()

        const chunks = await textSplitter.splitDocuments(docs)
        await PageAssistVectorStore.fromDocuments(chunks, ollamaEmbedding, {
          knownledge_id: knowledge.id,
          file_id: doc.source_id
        })
      } else {
        const loader = new PageAssisTXTUrlLoader({
          name: doc.filename,
          url: doc.content
        })

        let docs = await loader.load()

        const chunks = await textSplitter.splitDocuments(docs)

        await PageAssistVectorStore.fromDocuments(chunks, ollamaEmbedding, {
          knownledge_id: knowledge.id,
          file_id: doc.source_id
        })
      }
    }

    await updateKnowledgeStatus(id, "finished")
  } catch (error) {
    console.error(`Error processing knowledge with id: ${id}`, error)
    await updateKnowledgeStatus(id, "failed")
  } finally {
    console.log(`Finished processing knowledge with id: ${id}`)
  }
}
