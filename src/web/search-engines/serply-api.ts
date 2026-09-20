import { cleanUrl } from "~/libs/clean-url"
import {
  getIsSimpleInternetSearch,
  totalSearchResults,
  getSerplyApiKey
} from "@/services/search"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import type { Document } from "@langchain/core/documents"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { PageAssistHtmlLoader } from "@/loader/html"
import {
  defaultEmbeddingModelForRag,
  getOllamaURL,
  getSelectedModel
} from "~/services/ollama"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

interface SerplySearchResult {
  title: string
  link: string
  description: string
}

interface SerplyAPIResponse {
  results: SerplySearchResult[]
}

export const serplyAPISearch = async (query: string) => {
  const serplyApiKey = await getSerplyApiKey()
  if (!serplyApiKey || serplyApiKey.trim() === "") {
    throw new Error("Serply API key not configured")
  }
  const results = await apiSerplySearch(serplyApiKey, query)
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()

  const searchResults = results.slice(0, TOTAL_SEARCH_RESULTS)

  const isSimpleMode = await getIsSimpleInternetSearch()

  if (isSimpleMode) {
    await getOllamaURL()
    return searchResults.map((result) => {
      return {
        url: result.link,
        content: result?.content || result?.title
      }
    })
  }

  const docs: Document<Record<string, any>>[] = []
  try {
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
  } catch (error) {
    console.error(error)
  }

  const ollamaUrl = await getOllamaURL()
  const embeddingModel = await defaultEmbeddingModelForRag()
  const selectedModel = await getSelectedModel()
  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModel || selectedModel || "",
    baseUrl: cleanUrl(ollamaUrl)
  })

  const textSplitter = await getPageAssistTextSplitter()

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

const apiSerplySearch = async (serplyApiKey: string, query: string) => {
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()

  const searchURL = `https://api.serply.io/v1/search?q=${encodeURIComponent(
    query
  )}&num=${TOTAL_SEARCH_RESULTS}`

  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 20000)

  try {
    const response = await fetch(searchURL, {
      signal: abortController.signal,
      headers: {
        "X-Api-Key": serplyApiKey,
        Accept: "application/json",
        "User-Agent": "page-assist"
      }
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as SerplyAPIResponse

    return (data?.results ?? []).map((result) => ({
      title: result.title,
      link: result.link,
      content: result.description
    }))
  } catch (error) {
    console.error("Serply API search failed:", error)
    return []
  }
}
