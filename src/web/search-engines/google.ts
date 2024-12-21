import { pageAssistEmbeddingModel } from "@/models/embedding"
import {
  getGoogleDomain,
  getIsSimpleInternetSearch,
  totalSearchResults
} from "@/services/search"
import type { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { cleanUrl } from "~/libs/clean-url"
import { urlRewriteRuntime } from "~/libs/runtime"
import { PageAssistHtmlLoader } from "~/loader/html"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  getOllamaURL
} from "~/services/ollama"


export const localGoogleSearch = async (query: string) => {
  const baseGoogleDomain = await getGoogleDomain()
  await urlRewriteRuntime(
    cleanUrl(`https://www.${baseGoogleDomain}/search?hl=en&q=` + query),
    "google"
  )
  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 10000)

  const htmlString = await fetch(
    `https://www.${baseGoogleDomain}/search?hl=en&q=` + query,
    {
      signal: abortController.signal
    }
  )
    .then((response) => response.text())
    .catch()

  const parser = new DOMParser()

  const doc = parser.parseFromString(htmlString, "text/html")

  const searchResults = Array.from(doc.querySelectorAll("div.g")).map(
    (result) => {
      const title = result.querySelector("h3")?.textContent
      const link = result.querySelector("a")?.getAttribute("href")
      const content = Array.from(result.querySelectorAll("span"))
        .map((span) => span.textContent)
        .join(" ")
      return { title, link, content }
    }
  )
  return searchResults
}

export const webGoogleSearch = async (query: string) => {
  const results = await localGoogleSearch(query)
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()
  const searchResults = results.slice(0, TOTAL_SEARCH_RESULTS)

  const isSimpleMode = await getIsSimpleInternetSearch()

  if (isSimpleMode) {
    await getOllamaURL()
    return searchResults.map((result) => {
      return {
        url: result.link,
        content: result.content
      }
    })
  }

  const docs: Document<Record<string, any>>[] = []
  for (const result of searchResults) {
    const loader = new PageAssistHtmlLoader({
      html: "",
      url: result.link
    })

    const documents = await loader.loadByURL()

    documents.forEach((doc) => {
      docs.push(doc)
    })
  }
  const ollamaUrl = await getOllamaURL()

  const embeddingModle = await defaultEmbeddingModelForRag()
  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModle || "",
    baseUrl: cleanUrl(ollamaUrl)
  })

  const chunkSize = await defaultEmbeddingChunkSize()
  const chunkOverlap = await defaultEmbeddingChunkOverlap()
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  })

  const chunks = await textSplitter.splitDocuments(docs)

  const store = new MemoryVectorStore(ollamaEmbedding)

  await store.addDocuments(chunks)

  const resultsWithEmbeddings = await store.similaritySearch(query, 3)

  const searchResult = resultsWithEmbeddings.map((result) => {
    return {
      url: result.metadata.url,
      content: result.pageContent
    }
  })

  return searchResult
}
