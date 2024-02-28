import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama"
import type { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { cleanUrl } from "~libs/clean-url"
import { chromeRunTime } from "~libs/runtime"
import { PageAssistHtmlLoader } from "~loader/html"
import { defaultEmbeddingChunkOverlap, defaultEmbeddingChunkSize, defaultEmbeddingModelForRag, getOllamaURL } from "~services/ollama"

const BLOCKED_HOSTS = [
  "google.com",
  "youtube.com",
  "twitter.com",
  "linkedin.com",
]

const TOTAL_SEARCH_RESULTS = 2

export const localGoogleSearch = async (query: string) => {
  await chromeRunTime(
    cleanUrl("https://www.google.com/search?hl=en&q=" + query)
  )
  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 10000)

  const htmlString = await fetch(
    "https://www.google.com/search?hl=en&q=" + query,
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
      let content = result.querySelector("div[data-sncf='2']")?.textContent 
      if(content === "") {
        content = result.querySelector("div[data-sncf='1']")?.textContent
        if(content === "") {
          content = result.querySelector("div[data-sncf='3']")?.textContent
        }
      }
      return { title, link, content }
    }
  )
  const filteredSearchResults = searchResults
    .filter(
      (result) =>
        !result.link ||
        !BLOCKED_HOSTS.some((host) => result.link.includes(host))
    )
    .filter((result) => result.title && result.link)
  return filteredSearchResults
}


export const webSearch = async (query: string) => {
  const results = await localGoogleSearch(query)
  const searchResults = results.slice(0, TOTAL_SEARCH_RESULTS)

  const docs: Document<Record<string, any>>[] = [];
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
  const ollamaEmbedding = new OllamaEmbeddings({
    model: embeddingModle || "",
    baseUrl: cleanUrl(ollamaUrl),
  })

  const chunkSize = await defaultEmbeddingChunkSize();
  const chunkOverlap = await defaultEmbeddingChunkOverlap();
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
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