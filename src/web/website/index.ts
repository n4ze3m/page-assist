import { cleanUrl } from "@/libs/clean-url"
import { PageAssistHtmlLoader } from "@/loader/html"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { getNoOfRetrievedDocs } from "@/services/features/app"
import { getMaxContextSize, isChatWithWebsiteEnabled } from "@/services/features/kb"
import { defaultEmbeddingModelForRag, getOllamaURL } from "@/services/ai/ollama"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"

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

    const store = new PageAssistVectorStore(ollamaEmbedding, { knownledge_id: "web-search", file_id: "temp_uploaded_files" })

    await store.addDocuments(chunks)

    const rankedDocs = await store.similaritySearchKB(query, 4)

    const searchResult = rankedDocs.map((doc) => {
        return {
            url: (doc.metadata as any).url,
            content: doc.pageContent
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
