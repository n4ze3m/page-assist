import { cleanUrl } from "~/libs/clean-url"
import {
  getIsSimpleInternetSearch,
  totalSearchResults,
  getSpecStreamApiKey
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
import {
  buildSpecStreamSearchUrl,
  parseSpecStreamResults,
  type SpecStreamAPIResponse
} from "./specstream-parser"

export const specstreamAPISearch = async (query: string) => {
  const specstreamApiKey = await getSpecStreamApiKey()
  if (!specstreamApiKey || specstreamApiKey.trim() === "") {
    throw new Error("SpecStream API key not configured")
  }
  const isSimpleMode = await getIsSimpleInternetSearch()
  // Simple mode answers from the returned text, so ask SpecStream for the page
  // passages. Full mode loads each page itself, so snippets will do.
  const results = await apiSpecStreamSearch(
    specstreamApiKey,
    query,
    isSimpleMode
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

const apiSpecStreamSearch = async (
  specstreamApiKey: string,
  query: string,
  withPassages: boolean
) => {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 30000)

  try {
    const response = await fetch(
      buildSpecStreamSearchUrl(query, withPassages),
      {
        signal: abortController.signal,
        headers: {
          Authorization: `Bearer ${specstreamApiKey}`,
          Accept: "application/json"
        }
      }
    )

    if (!response.ok) {
      return []
    }

    return parseSpecStreamResults((await response.json()) as SpecStreamAPIResponse)
  } catch (error) {
    console.error("SpecStream API search failed:", error)
    return []
  } finally {
    clearTimeout(timeout)
  }
}
