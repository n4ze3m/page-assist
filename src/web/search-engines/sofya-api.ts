import { cleanUrl } from "~/libs/clean-url"
import {
  getIsSimpleInternetSearch,
  totalSearchResults,
  getSofyaApiKey
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

// Page text per result in simple mode, so a few results stay within the
// context of small local models.
const MAX_CONTENT_CHARS = 4000

interface SofyaSearchResult {
  title: string
  url: string
  description?: string | null
  content?: string
}

interface SofyaAPIResponse {
  results: SofyaSearchResult[]
}

export const sofyaAPISearch = async (query: string) => {
  const sofyaApiKey = await getSofyaApiKey()
  if (!sofyaApiKey || sofyaApiKey.trim() === "") {
    throw new Error("Sofya API key not configured")
  }
  const isSimpleMode = await getIsSimpleInternetSearch()
  // Simple mode answers from the returned text, so ask Sofya for the page
  // text ("basic"). Full mode loads each page itself, so snippets will do.
  const results = await apiSofyaSearch(
    sofyaApiKey,
    query,
    isSimpleMode ? "basic" : "snippets"
  )
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()

  const searchResults = results.slice(0, TOTAL_SEARCH_RESULTS)

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

const apiSofyaSearch = async (
  sofyaApiKey: string,
  query: string,
  searchDepth: "basic" | "snippets"
) => {
  const TOTAL_SEARCH_RESULTS = await totalSearchResults()

  const searchURL = "https://sofya.co/v1/search"

  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 20000)

  try {
    const response = await fetch(searchURL, {
      signal: abortController.signal,
      method: "POST",
      body: JSON.stringify({
        query,
        max_results: Math.min(TOTAL_SEARCH_RESULTS, 20),
        search_depth: searchDepth
      }),
      headers: {
        Authorization: `Bearer ${sofyaApiKey}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as SofyaAPIResponse

    return (data?.results ?? []).map((result) => ({
      title: result.title,
      link: result.url,
      content: (result.content || result.description || "").slice(
        0,
        MAX_CONTENT_CHARS
      )
    }))
  } catch (error) {
    console.error("Sofya API search failed:", error)
    return []
  }
}
