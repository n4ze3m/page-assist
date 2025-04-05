import { cleanUrl } from "~/libs/clean-url"
import { getIsSimpleInternetSearch, totalSearchResults, getTavilyApiKey } from "@/services/search"
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

interface Results {
    title: string,
    link: string,
    content: string,
}

interface TavilyAPIResult {
    answer: string
    results: Array<Results>
}

export const tavilyAPISearch = async (query: string) => {
    const tavilyApiKey = await getTavilyApiKey()
    if (!tavilyApiKey || tavilyApiKey.trim() === "") {
        throw new Error("Tavily API key not configured")
    }
    const result = await apiTavilySearch(tavilyApiKey, query)
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    let searchResults: Results[] = []
    if('results' in result) {
        searchResults = result.results.slice(0, TOTAL_SEARCH_RESULTS) 
    }

    const isSimpleMode = await getIsSimpleInternetSearch()

    if (isSimpleMode && 'answer' in result) {
        await getOllamaURL()
        return {
            answer: result.answer,
            results: searchResults.map((result) => {
                return {
                    url: result.link,
                    content: result.content
                }
            })
        }
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

const apiTavilySearch = async (tavilySearchApi: string, query: string): Promise<TavilyAPIResult | []> => {
    const MAX_SEARCH_RESULTS = await totalSearchResults()
    const isSimpleMode = await getIsSimpleInternetSearch()

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 20000)

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: tavilySearchApi,
                query,
                max_results: MAX_SEARCH_RESULTS,
                include_answer: isSimpleMode
            }),
            signal: abortController.signal
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error('Corpo do erro:', errorBody)
            throw new Error(`Erro na API: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()
        
        // Validação básica da resposta
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('Resposta inválida da API do Tavily')
        }

        return {
            answer: data.answer || '',
            results: data.results.map((result: any) => ({
                title: result.title || '',
                link: result.url || '',
                content: result.content || '',
            }))
        }
    } catch (error) {
        console.error('Tavily API search failed:', error)
        return []
    } finally {
        clearTimeout(timeout)
    }
}