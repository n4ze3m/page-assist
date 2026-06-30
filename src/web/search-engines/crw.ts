import { cleanUrl } from "~/libs/clean-url"
import {
    getIsSimpleInternetSearch,
    totalSearchResults,
    getCrwAPIKey,
    getCrwBaseURL
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

interface CrwSearchResult {
    title: string
    url: string
    description: string
    markdown: string
}

interface CrwSearchResponse {
    data: CrwSearchResult[]
}

export const crwAPISearch = async (query: string) => {
    const crwAPIKey = await getCrwAPIKey()
    const crwBaseURL = await getCrwBaseURL()

    if (!crwBaseURL || crwBaseURL.trim() === "") {
        throw new Error("CRW base URL not configured")
    }

    const results = await apiCrwSearch(crwBaseURL, crwAPIKey, query)
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

const apiCrwSearch = async (
    baseURL: string,
    apiKey: string,
    query: string
) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    const trimmedBase = baseURL.trim()
    const cleanedBase = cleanUrl(trimmedBase)
    const baseWithoutTrailingSlash = cleanedBase.replace(/\/+$/, "")
    const normalizedBase = baseWithoutTrailingSlash.endsWith("/v1")
        ? baseWithoutTrailingSlash
        : `${baseWithoutTrailingSlash}/v1`
    const searchURL = `${normalizedBase}/search`

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 20000)

    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json"
    }

    if (apiKey && apiKey.trim() !== "") {
        headers["Authorization"] = `Bearer ${apiKey}`
    }

    try {
        const response = await fetch(searchURL, {
            signal: abortController.signal,
            method: "POST",
            headers,
            body: JSON.stringify({
                limit: TOTAL_SEARCH_RESULTS,
                lang: "",
                country: "",
                timeout: 60000,
                scrapeOptions: { formats: [] },
                query: query
            })
        })

        if (!response.ok) {
            return []
        }

        const data = (await response.json()) as CrwSearchResponse

        return data?.data.map((result) => ({
            title: result.title,
            link: result.url,
            content: result.description
        }))
    } catch (error) {
        console.error("CRW API search failed:", error)
        return []
    } finally {
        clearTimeout(timeoutId)
    }
}
