import { cleanUrl } from "~/libs/clean-url"
import { getIsSimpleInternetSearch, totalSearchResults, getBraveApiKey } from "@/services/search"
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

interface BraveAPIResult {
    title: string
    url: string
    description: string
}

interface BraveAPIResponse {
    web: {
        results: BraveAPIResult[]
    }
}

export const braveAPISearch = async (query: string) => {
    const braveApiKey = await getBraveApiKey()
    if (!braveApiKey || braveApiKey.trim() === "") {
        throw new Error("Brave API key not configured")
    }
    const results = await apiBraveSearch(braveApiKey, query)
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

const apiBraveSearch = async (braveApiKey: string, query: string) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    const searchURL = `https://api.search.brave.com/res/v1/web/search?q=${query}&count=${TOTAL_SEARCH_RESULTS}`

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 20000)

    try {
        const response = await fetch(searchURL, {
            signal: abortController.signal,
            headers: {
                "X-Subscription-Token": braveApiKey,
                Accept: "application/json",
            }
        })

        if (!response.ok) {
            return []
        }

        const data = await response.json() as BraveAPIResponse
        
        return data?.web?.results.map(result => ({
            title: result.title,
            link: result.url,
            content: result.description
        }))
    } catch (error) {
        console.error('Brave API search failed:', error)
        return []
    }
}
