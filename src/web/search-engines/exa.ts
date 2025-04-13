import { cleanUrl } from "~/libs/clean-url"
import {
  getIsSimpleInternetSearch,
  totalSearchResults,
  getExaAPIKey
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

interface ExaAPIResult {
  title: string
  url: string
  text: string
}

interface ExaAPIResponse {
    results: ExaAPIResult[]
}

export const exaAPISearch = async (query: string) => {
  const exaAPIKey = await getExaAPIKey()
  if (!exaAPIKey || exaAPIKey.trim() === "") {
    throw new Error("Exa API key not configured")
  }
  const results = await apiExaSearch(exaAPIKey, query)
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

const apiExaSearch = async (exaApiKey: string, query: string) => {
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()

  const searchURL = "https://api.exa.ai/search"

  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 20000)

  try {
    const response = await fetch(searchURL, {
      signal: abortController.signal,
      method: "POST",
      body: JSON.stringify({
        query,
        numResults: TOTAL_SEARCH_RESULTS,
        text: true
      }),
      headers: {
        Authorization: `Bearer ${exaApiKey}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as ExaAPIResponse

    return data?.results.map((result) => ({
      title: result.title,
      link: result.url,
      content: result.text
    }))
  } catch (error) {
    console.error("EXA API search failed:", error)
    return []
  }
}
