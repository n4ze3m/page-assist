import { cleanUrl } from "@/libs/clean-url"
import { urlRewriteRuntime } from "@/libs/runtime"
import { PageAssistHtmlLoader } from "@/loader/html"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import {
    defaultEmbeddingModelForRag,
    getOllamaURL
} from "@/services/ollama"
import {
    getIsSimpleInternetSearch,
    totalSearchResults
} from "@/services/search"
import { getPageAssistTextSplitter } from "@/utils/text-splitter"

import type { Document } from "@langchain/core/documents"
import * as cheerio from "cheerio"
import { MemoryVectorStore } from "langchain/vectorstores/memory"

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

    console.log(searchResults)

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
    const ollamaUrl = await getOllamaURL()

    const embeddingModle = await defaultEmbeddingModelForRag()
    const ollamaEmbedding = await pageAssistEmbeddingModel({
        model: embeddingModle || "",
        baseUrl: cleanUrl(ollamaUrl)
    })

 
    const textSplitter = await getPageAssistTextSplitter();

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
