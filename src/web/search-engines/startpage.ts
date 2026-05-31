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

export const localStartPageSearch = async (query: string) => {
    const TOTAL_SEARCH_RESULTS = await totalSearchResults()

    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10000)

    const htmlString = await fetch(
        "https://www.startpage.com/sp/search?query=" + encodeURIComponent(query) + "&cat=web&pl=Opensearch",
        {
            signal: abortController.signal
        }
    ).then((response) => response.text())
        .catch()
    const parser = new DOMParser()

    const doc = parser.parseFromString(htmlString, "text/html")

    // Get all search results
    const results = doc.querySelectorAll('.result');
    const parsedResults = [];

    results.forEach(result => {
        const titleElement = result.querySelector('.wgl-title');
        const descriptionElement = result.querySelector('.description');
        const urlElement = result.querySelector('.wgl-display-url .default-link-text');

        if (titleElement && descriptionElement && urlElement) {
            parsedResults.push({
                title: titleElement.textContent.trim(),
                content: descriptionElement.textContent.trim(),
                link: urlElement.textContent.trim()
            });
        }
    });


    return parsedResults.slice(0, TOTAL_SEARCH_RESULTS);

}

export const startpageSearch = async (query: string) => {
    const searchResults = await localStartPageSearch(query)

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
