import { cleanUrl } from "@/libs/clean-url"
import { PageAssistHtmlLoader } from "@/loader/html"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import {
    defaultEmbeddingModelForRag,
    getOllamaURL,
    getSelectedModel
} from "@/services/ai/ollama"
import {
    getIsSimpleInternetSearch,
    totalSearchResults
} from "@/services/features/search"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"
import type { Document } from "@langchain/core/documents"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"

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

    const store = new PageAssistVectorStore(ollamaEmbedding, { knownledge_id: "web-search", file_id: "temp_uploaded_files" })

    await store.addDocuments(chunks)

    const rankedDocs = await store.similaritySearchKB(query, 3)

    const searchResult = rankedDocs.map((doc) => {
        return {
            url: (doc.metadata as any).url,
            content: doc.pageContent
        }
    })

    return searchResult
}
