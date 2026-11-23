import { cleanUrl } from "~/libs/clean-url"
import { getIsSimpleInternetSearch, totalSearchResults } from "@/services/search"
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


interface KeenableResult {
    title?: string
    url?: string
    description?: string
    snippet?: string
}

interface KeenableResponse {
    results?: KeenableResult[]
}

const KEENABLE_SNIPPET_MAX_CHARS = 1000

export const keenableSearch = async (query: string) => {

    const results = await apiKeenableSearch(query)
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

const apiKeenableSearch = async (query: string) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    // Keenable's public endpoint is free and needs no API key.
    const searchURL = 'https://api.keenable.ai/v1/search/public'

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 20000)

    try {
        const response = await fetch(searchURL, {
            signal: abortController.signal,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-Keenable-Title": "Page Assist",
            },
            method: "POST",
            body: JSON.stringify({
                query,
                max_results: TOTAL_SEARCH_RESULTS
            })
        })

        if (!response.ok) {
            return []
        }

        const data = await response.json() as KeenableResponse

        return (data?.results ?? [])
            .filter((result) => result.url)
            .map((result) => {
                const snippet = result.snippet ?? ""
                return {
                    title: result.title ?? "",
                    link: result.url as string,
                    // Prefer the short description; the snippet can be long.
                    content: result.description ||
                        (snippet.length > KEENABLE_SNIPPET_MAX_CHARS
                            ? `${snippet.slice(0, KEENABLE_SNIPPET_MAX_CHARS)}…`
                            : snippet)
                }
            })
    } catch (error) {
        console.error('Keenable search failed:', error)
        return []
    } finally {
        clearTimeout(timeout)
    }
}
