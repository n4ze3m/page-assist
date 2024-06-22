import { cleanUrl } from "@/libs/clean-url"
import { extractReadabilityContent } from "@/parser/reader"
import { defaultEmbeddingChunkOverlap, defaultEmbeddingChunkSize, defaultEmbeddingModelForRag, getOllamaURL } from "@/services/ollama"
import { getIsSimpleInternetSearch } from "@/services/search"
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama"
import type { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"

export const processSingleWebsite = async (url: string, query: string) => {
    let content = await extractReadabilityContent(url)

    // const isSimpleMode = await getIsSimpleInternetSearch()

    // if (isSimpleMode) {
    //     return [
    //         {
    //             url,
    //             content: content.length > 5000 ? content.slice(0, 5000) : content
    //         }
    //     ]
    // }

    const docs: Document<Record<string, any>>[] = [
        {
            metadata: {
                url
            },
            pageContent: content
        }
    ]

    const ollamaUrl = await getOllamaURL()

    const embeddingModle = await defaultEmbeddingModelForRag()
    const ollamaEmbedding = new OllamaEmbeddings({
        model: embeddingModle || "",
        baseUrl: cleanUrl(ollamaUrl)
    })

    const chunkSize = await defaultEmbeddingChunkSize()
    const chunkOverlap = await defaultEmbeddingChunkOverlap()
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap
    })

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