import { cleanUrl } from "@/libs/clean-url"
import { PageAssistHtmlLoader } from "@/loader/html"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import {
    defaultEmbeddingModelForRag,
    getOllamaURL,
    getSelectedModel
} from "@/services/ollama"
import {
    getIsSimpleInternetSearch,
    totalSearchResults
} from "@/services/search"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"
import type { Document } from "@langchain/core/documents"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"

export const localBaiduSearch = async (query: string) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10000)

    const jsonRes = await fetch(
        "https://www.baidu.com/s?wd=" + encodeURIComponent(query) + "&tn=json&rn=" + TOTAL_SEARCH_RESULTS,
        {
            signal: abortController.signal
        }
    )
        .then((response) => response.json())
        .catch((e) => {
            console.log(e)
            return {
                feed: {
                    entry: []
                }
            }
        })

    const data = jsonRes?.feed?.entry || []

    const searchResults = data.map((result: any) => {
        const title = result?.title || ""
        const link = result?.url
        const content = result?.abs || ""
        return { title, link, content }
    })


    return searchResults.filter((result) => result?.link)
}

export const webBaiduSearch = async (query: string) => {
    const searchResults = await localBaiduSearch(query)

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
    const ollamaUrl = await getOllamaURL()

    const embeddingModle = await defaultEmbeddingModelForRag()
    const selectedModel = await getSelectedModel()

    const ollamaEmbedding = await pageAssistEmbeddingModel({
        model: embeddingModle || selectedModel || "",
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
