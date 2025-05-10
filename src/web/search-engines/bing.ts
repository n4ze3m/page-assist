import { cleanUrl } from "@/libs/clean-url"
import { urlRewriteRuntime } from "@/libs/runtime"
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
import * as cheerio from "cheerio"
import { MemoryVectorStore } from "langchain/vectorstores/memory"

const BING_SEARCH_URL = "https://www.bing.com/search?q="

export const localBingSearch = async (query: string) => {
    await urlRewriteRuntime(
        cleanUrl(BING_SEARCH_URL + query),
        "bing"
    )

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10000)

    const htmlString = await fetch(BING_SEARCH_URL + query, {
        signal: abortController.signal
    })
        .then((response) => response.text())
        .catch()

    const $ = cheerio.load(htmlString)
    const $results = $("#b_content #b_results")
    const $snippets = $results.find(".b_algo")
    const searchResults = Array.from($snippets).map((result) => {
        const link = $(result).find(".tilk").attr("href")
        const title = $(result).find("h2").find("a").text()
        const content = $(result).find(".b_caption").find("p").text()
        return { title, link, content }
    }).filter((result) => result.link && result.title && result.content)

    const $newsSnippets = $results.find(".b_nwsAns")
    if ($newsSnippets.length > 0) {
        const newsResults = Array.from($newsSnippets).map((result) => {
            const link = $(result).find("a.itm_link").attr("href")
            const title = $(result).find(".na_t_news_caption").text()
            const content = $(result).find(".itm_spt_news_caption").text()
            const _source = 'Bing News'
            return { title, link, content, _source }
        }).filter((result) => result.link && result.title && result.content)
        searchResults.push(...newsResults)
    }

    return searchResults
}

export const webBingSearch = async (query: string) => {
    const results = await localBingSearch(query)
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
    const selectedModel = await getSelectedModel()

    const ollamaEmbedding = await pageAssistEmbeddingModel({
        model: embeddingModle || selectedModel || "",
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