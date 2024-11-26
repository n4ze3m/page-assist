import type { EmbeddingsInterface } from "@langchain/core/embeddings"
import type { Document } from "@langchain/core/documents"
import * as ml_distance from "ml-distance"

export const rerankDocs = async ({
  query,
  docs,
  embedding
}: {
  query: string
  docs: Document[]
  embedding: EmbeddingsInterface
}) => {
  if (docs.length === 0) {
    return docs
  }

  const docsWithContent = docs.filter(
    (doc) => doc.pageContent && doc.pageContent.length > 0
  )

  const [docEmbeddings, queryEmbedding] = await Promise.all([
    embedding.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
    embedding.embedQuery(query)
  ])

  const similarity = docEmbeddings.map((docEmbedding, i) => {
    // perform cosine similarity between query and document
    const sim = ml_distance.similarity.cosine(queryEmbedding, docEmbedding)

    return {
      index: i,
      similarity: sim
    }
  })

  console.log("similarity", similarity)
  const sortedDocs = similarity
    .sort((a, b) => b.similarity - a.similarity)
    .filter((sim) => sim.similarity > 0.5)
    .slice(0, 15)
    .map((sim) => docsWithContent[sim.index])

  return sortedDocs
}
