import { cleanUrl } from "~/libs/clean-url"
import {
  getIsSimpleInternetSearch,
  totalSearchResults,
  getBraveApiKey,
  getOllamaSearchApiKey
} from "@/services/search"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import type { Document } from "@langchain/core/documents"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { PageAssistHtmlLoader } from "~/loader/html"
import {
  defaultEmbeddingModelForRag,
  getOllamaURL,
  getSelectedModel
} from "~/services/ollama"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

interface OllamaAPIResult {
  title: string
  url: string
  content: string
}

interface OllamaAPIResponse {
  results: OllamaAPIResult[]
}

export const ollamaAPISearch = async (query: string) => {
  const ollamaApiKey = await getOllamaSearchApiKey()
  if (!ollamaApiKey || ollamaApiKey.trim() === "") {
    throw new Error("Ollama API key not configured")
  }
  const results = await apiOllamaSearch(ollamaApiKey, query)
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

const apiOllamaSearch = async (ollamaApiKey: string, query: string) => {
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()

  const searchURL = "https://ollama.com/api/web_search"

  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 20000)

  try {
    const response = await fetch(searchURL, {
      signal: abortController.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${ollamaApiKey}`,
        Accept: "application/json"
      },
      body: JSON.stringify({
        query,
        max_results: TOTAL_SEARCH_RESULTS
      })
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as OllamaAPIResponse

    return data?.results.map((result) => ({
      title: result.title,
      link: result.url,
      content: result.content
    }))
  } catch (error) {
    console.error("Ollama API search failed:", error)
    return []
  }
}
