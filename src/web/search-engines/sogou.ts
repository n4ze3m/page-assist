import { cleanUrl } from "@/libs/clean-url"
import { urlRewriteRuntime } from "@/libs/runtime"
import { PageAssistHtmlLoader } from "@/loader/html"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  getOllamaURL
} from "@/services/ollama"
import {
  getIsSimpleInternetSearch,
  totalSearchResults
} from "@/services/search"
import type { Document } from "@langchain/core/documents"
import * as cheerio from "cheerio"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
const getCorrectTargeUrl = async (url: string) => {
  if (!url) return ""
  const res = await fetch(url)
  const $ = cheerio.load(await res.text())
  const link = $("script").text()
  const matches = link.match(/"(.*?)"/)
  return matches?.[1] || ""
}
export const localSogouSearch = async (query: string) => {
  await urlRewriteRuntime(
    cleanUrl("https://www.sogou.com/web?query=" + query),
    "sogou"
  )

  const abortController = new AbortController()

  setTimeout(() => abortController.abort(), 10000)

  const htmlString = await fetch("https://www.sogou.com/web?query=" + query, {
    signal: abortController.signal
  })
    .then((response) => response.text())
    .catch()

  const $ = cheerio.load(htmlString)
  const $result = $("#main .results")
  const nodes = $result.children().map(async (i, el) => {
    const $el = $(el)
    const title = $el.find(".vr-title").text().replace(/\n/g, "").trim()
    let link = $el.find(".vr-title > a").get(0)?.attribs.href
    const content = [".star-wiki", ".fz-mid", ".attribute-centent"]
      .map((selector) => {
        ;[".text-lightgray", ".zan-box", ".tag-website"].forEach((cls) => {
          $el.find(cls).remove()
        })
        return $el.find(selector).text().trim() ?? ""
      })
      .join(" ")
    if (link?.startsWith("/")) {
      link = await getCorrectTargeUrl(`https://www.sogou.com${link}`)
    }
    return { title, link, content }
  })

  const searchResults = await Promise.all(nodes)
  return searchResults.filter(
    (result) => result.link && result.title && result.content
  )
}

export const webSogouSearch = async (query: string) => {
  const results = await localSogouSearch(query)
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
