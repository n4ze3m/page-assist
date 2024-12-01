import { urlRewriteRuntime } from "~/libs/runtime"
import { cleanUrl } from "~/libs/clean-url"
import { getSearxngURL, isSearxngJSONMode, getIsSimpleInternetSearch, totalSearchResults } from "@/services/search"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import type { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { PageAssistHtmlLoader } from "~/loader/html"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  getOllamaURL
} from "~/services/ollama"

interface SearxNGJSONResult {
  title: string
  url: string
  content: string
}

interface SearxNGJSONResponse {
  results: SearxNGJSONResult[]
}

export const searxngSearch = async (query: string) => {
  const searxngURL = await getSearxngURL()
  if (!searxngURL) {
    throw new Error("SearXNG URL not configured")
  }

  const isJSONMode = await isSearxngJSONMode()
  const results = isJSONMode
    ? await searxngJSONSearch(searxngURL, query)
    : await searxngWebSearch(searxngURL, query)

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
  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModel || "",
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

const searxngJSONSearch = async (baseURL: string, query: string) => {
  const searchURL = `${cleanUrl(baseURL)}?q=${encodeURIComponent(query)}&format=json`

  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 20000)

  try {
    const response = await fetch(searchURL, {
      signal: abortController.signal,
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`SearXNG search failed: ${response.statusText}`)
    }

    const data = await response.json() as SearxNGJSONResponse

    return data.results.map(result => ({
      title: result.title,
      link: result.url,
      content: result.content
    }))
  } catch (error) {
    console.error('SearXNG JSON search failed:', error)
    return []
  }
}

const searxngWebSearch = async (baseURL: string, query: string) => {
  const searchURL = `${cleanUrl(baseURL)}?q=${encodeURIComponent(query)}`

  await urlRewriteRuntime(cleanUrl(searchURL), "searxng")

  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 10000)

  try {
    const htmlString = await fetch(searchURL, {
      signal: abortController.signal
    }).then(response => response.text())

    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, "text/html")

    const searchResults = Array.from(doc.querySelectorAll("article.result")).map(result => {
      const title = result.querySelector("h3")?.textContent?.trim()
      const link = result.querySelector("a.url_header")?.getAttribute("href")
      const content = result.querySelector("p.content")?.textContent?.trim()
      return { title, link, content }
    }).filter(result => result.title && result.link && result.content)

    return searchResults
  } catch (error) {
    console.error('SearXNG web search failed:', error)
    return []
  }
}
