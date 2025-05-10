import { cleanUrl } from "~/libs/clean-url"
import { getIsSimpleInternetSearch, totalSearchResults } from "@/services/search"
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


export interface Snippet {
    date: any
    text: Text
}

export interface Text {
    fragments: Fragment[]
}

export interface Fragment {
    kind: string
    text: string
}

interface StractAPIResult {
    title: string
    url: string
    snippet: Snippet

}

interface StractAPIResponse {
    webpages: StractAPIResult[]
}

export const stractSearch = async (query: string) => {

    const results = await apiStractSearch(query)
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

const apiStractSearch = async (query: string) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    const searchURL = 'https://stract.com/beta/api/search'

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 20000)

    try {
        const response = await fetch(searchURL, {
            signal: abortController.signal,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                query,
                num_results: TOTAL_SEARCH_RESULTS
            })
        })

        if (!response.ok) {
            return []
        }

        const data = await response.json() as StractAPIResponse

        return data?.webpages?.map(result => ({
            title: result.title,
            link: result.url,
            content: result.snippet.text.fragments.map(e => e.text).join(" ")
        }))
    } catch (error) {
        console.error('Stract search failed:', error)
        return []
    }
}
