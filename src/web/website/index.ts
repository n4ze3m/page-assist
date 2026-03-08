import { cleanUrl } from "@/libs/clean-url"
import { PageAssistHtmlLoader } from "@/loader/html"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { getNoOfRetrievedDocs } from "@/services/app"
import { getMaxContextSize, isChatWithWebsiteEnabled } from "@/services/kb"
import { defaultEmbeddingModelForRag, getOllamaURL } from "@/services/ollama"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"

export const processSingleWebsite = async (url: string, query: string) => {
    const loader = new PageAssistHtmlLoader({
        html: "",
        url
    })
    const docs = await loader.loadByURL()

    const maxContextSize = await getMaxContextSize()

    const useVS = await isChatWithWebsiteEnabled()

    if (useVS) {
        if (docs.length > 0) {
            const doc = docs[0]
            return [
                {
                    url: doc?.metadata?.url,
                    content: doc?.pageContent?.substring(0, maxContextSize),
                }
            ]
        }
    }


    const ollamaUrl = await getOllamaURL()

    const embeddingModle = await defaultEmbeddingModelForRag()
    const ollamaEmbedding = await pageAssistEmbeddingModel({
        model: embeddingModle || "",
        baseUrl: cleanUrl(ollamaUrl)
    })


    const textSplitter = await getPageAssistTextSplitter()

    const chunks = await textSplitter.splitDocuments(docs)

    const store = new MemoryVectorStore(ollamaEmbedding)

    await store.addDocuments(chunks)

    const resultsWithEmbeddings = await store.similaritySearch(query, 4)

    const searchResult = resultsWithEmbeddings.map((result) => {
        return {
            url: result.metadata.url,
            content: result.pageContent
        }
    })

    return searchResult
}


export const getWebsiteFromQuery = (query: string): {
    queryWithouUrls: string,
    url: string,
    hasUrl: boolean
} => {

    const urlRegex = /https?:\/\/[^\s]+/g

    const urls = query.match(urlRegex)

    if (!urls) {
        return {
            queryWithouUrls: query,
            url: "",
            hasUrl: false
        }
    }

    const url = urls[0]

    const queryWithouUrls = query.replace(url, "")

    return {
        queryWithouUrls,
        url,
        hasUrl: true
    }
}