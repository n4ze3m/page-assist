import { cleanUrl } from "~/libs/clean-url"
import { getIsSimpleInternetSearch, totalSearchResults, getKagiApiKey } from "@/services/search"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import type { Document } from "@langchain/core/documents"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"
import { PageAssistHtmlLoader } from "~/loader/html"
import {
    defaultEmbeddingModelForRag,
    getOllamaURL,
    getSelectedModel
} from "~/services/ollama"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

interface KagiSearchResult {
    t: number
    url?: string
    title?: string
    snippet?: string
    published?: number
    thumbnail?: {
        url: string
        height?: number
        width?: number
    }
    list?: string[]
}

interface KagiAPIResponse {
    meta: {
        id: string
        node: string
        ms: number
    }
    data: KagiSearchResult[]
    error?: Array<{
        code: number
        msg: string
        ref?: string
    }>
}

export const kagiAPISearch = async (query: string) => {
    const kagiApiKey = await getKagiApiKey()
    if (!kagiApiKey || kagiApiKey.trim() === "") {
        throw new Error("Kagi API key not configured")
    }
    const results = await apiKagiSearch(kagiApiKey, query)
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
    const store = new PageAssistVectorStore(ollamaEmbedding, { knownledge_id: "web-search", file_id: "temp_uploaded_files" })
    await store.addDocuments(chunks)

    const resultsWithEmbeddings = await store.similaritySearchKB(query, 3)

    const searchResult = resultsWithEmbeddings.map((result) => {
        return {
            url: result.metadata.url,
            content: result.pageContent
        }
    })

    return searchResult
}

const apiKagiSearch = async (kagiApiKey: string, query: string) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    const searchURL = `https://kagi.com/api/v0/search?q=${encodeURIComponent(query)}&limit=${TOTAL_SEARCH_RESULTS}`

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 20000)

    try {
        const response = await fetch(searchURL, {
            signal: abortController.signal,
            headers: {
                "Authorization": `Bot ${kagiApiKey}`,
                "Accept": "application/json",
            }
        })

        if (!response.ok) {
            return []
        }

        const data = await response.json() as KagiAPIResponse

        // Filter only Search Result objects (t === 0) and map them
        return data?.data
            ?.filter(result => result.t === 0 && result.url && result.title)
            .map(result => ({
                title: result.title!,
                link: result.url!,
                content: result.snippet || ""
            })) || []
    } catch (error) {
        console.error('Kagi API search failed:', error)
        return []
    }
}
