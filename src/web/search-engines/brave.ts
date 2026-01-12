import { cleanUrl } from "@/libs/clean-url"
import { urlRewriteRuntime } from "@/libs/runtime"
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
import * as cheerio from "cheerio"
import { PageAssistVectorStore } from "@/libs/PageAssistVectorStore"

export const localBraveSearch = async (query: string) => {
    await urlRewriteRuntime(cleanUrl("https://search.brave.com/search?q=" + query), "duckduckgo")

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10000)

    const htmlString = await fetch(
        "https://search.brave.com/search?q=" + query,
        {
            signal: abortController.signal
        }
    )
        .then((response) => response.text())
        .catch()

    const $ = cheerio.load(htmlString)
    const $results = $("div#results")
    const $snippets = $results.find("div.snippet")

    const searchResults = Array.from($snippets).map((result) => {
        const link = $(result).find("a").attr("href")
        const title = $(result).find("div.title").text()
        const content = $(result).find("div.snippet-description").text()
        return { title, link, content }
    }).filter((result) => result.link && result.title && result.content)


    return searchResults
}

export const webBraveSearch = async (query: string) => {
    const results = await localBraveSearch(query)
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
    // Rename 'docs' to avoid redeclaration below
    const baseDocs = docs
    const ollamaUrl = await getOllamaURL()
    const selectedModel = await getSelectedModel()

    const embeddingModle = await defaultEmbeddingModelForRag()
    const ollamaEmbedding = await pageAssistEmbeddingModel({
        model: embeddingModle || selectedModel || "",
        baseUrl: cleanUrl(ollamaUrl)
    })


    const textSplitter = await getPageAssistTextSplitter();

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
