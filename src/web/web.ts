import { getWebSearchPrompt } from "~/services/ollama"
import { webGoogleSearch } from "./search-engines/google"
import { webDuckDuckGoSearch } from "./search-engines/duckduckgo"
import { getIsVisitSpecificWebsite, getSearchProvider } from "@/services/search"
import { webSogouSearch } from "./search-engines/sogou"
import { webBraveSearch } from "./search-engines/brave"
import { getWebsiteFromQuery, processSingleWebsite } from "./website"
import { searxngSearch } from "./search-engines/searxng"
import { braveAPISearch } from "./search-engines/brave-api"
import { tavilyAPISearch } from "./search-engines/tavily-api"
import { webBaiduSearch } from "./search-engines/baidu"
import { webBingSearch } from "./search-engines/bing"
import { stractSearch } from "./search-engines/stract"
import { startpageSearch } from "./search-engines/startpage"
import { exaAPISearch } from "./search-engines/exa"
import { firecrawlAPISearch } from "./search-engines/firecrawl"
import { ollamaAPISearch } from "./search-engines/ollama"

interface ProviderResults {
  url: any
  content: string | null
}

interface SearchProviderResult {
  url: string
  content: string | null
  answer: string | null
  results: ProviderResults[] | null
}

const getHostName = (url: string) => {
  try {
    return new URL(url).hostname
  } catch (e) {
    console.error("Failed to get hostname:", e)
    return ""
  }
}

const searchWeb = (provider: string, query: string) => {
  switch (provider) {
    case "duckduckgo":
      return webDuckDuckGoSearch(query)
    case "sogou":
      return webSogouSearch(query)
    case "brave":
      return webBraveSearch(query)
    case "searxng":
      return searxngSearch(query)
    case "brave-api":
      return braveAPISearch(query)
    case "tavily-api":
      return tavilyAPISearch(query)
    case "baidu":
      return webBaiduSearch(query)
    case "bing":
      return webBingSearch(query)
    case "stract":
      return stractSearch(query)
    case "startpage":
      return startpageSearch(query)
    case "exa":
      return exaAPISearch(query)
    case "firecrawl":
      return firecrawlAPISearch(query)
    case "ollama-search":
      return ollamaAPISearch(query)  
    default:
      return webGoogleSearch(query)
  }
}

const getProvidedURLs = (
  searchOnProviders: SearchProviderResult | ProviderResults[],
  searchOnAWebSite: ProviderResults[]
) => {
  let urlList = []
  if ('results' in searchOnProviders) {
    urlList = searchOnProviders.results
  } else if (searchOnProviders.length >= 1) {
    urlList = searchOnProviders
  } else {
    urlList = searchOnAWebSite
  }
  return urlList
}

export const isQueryHaveWebsite = async (query: string) => {
  const websiteVisit = getWebsiteFromQuery(query)

  const isVisitSpecificWebsite = await getIsVisitSpecificWebsite()

  return isVisitSpecificWebsite && websiteVisit.hasUrl
}

export const getSystemPromptForWeb = async (query: string, returnSearchResults: boolean = false) => {
  try {
    const websiteVisit = getWebsiteFromQuery(query)
    let searchOnAWebSite: ProviderResults[] = []
    let searchOnProviders: SearchProviderResult | [] = []

    const isVisitSpecificWebsite = await getIsVisitSpecificWebsite()
    let search_results: string = ""

    if (isVisitSpecificWebsite && websiteVisit.hasUrl) {
      const url = websiteVisit.url
      const queryWithoutUrl = websiteVisit.queryWithouUrls
      searchOnAWebSite = await processSingleWebsite(url, queryWithoutUrl)
      for (const result of searchOnAWebSite) {
        search_results += `<result source="${result.url}" id="0">${result?.content}</result>`
        search_results += (`\n`)
      }
    } else {
      const searchProvider = await getSearchProvider()
      searchOnProviders = await searchWeb(searchProvider, query)
      if ('answer' in searchOnProviders) {
        search_results += `<result id="0">${searchOnProviders.answer}</result>`
        search_results += (`\n`)
      } else {
        search_results = searchOnProviders.map((result: ProviderResults, idx) =>
          `<result source="${result.url}" id="${idx}">${result?.content}</result>`
        )
          .join("\n")
      }
    }

    const urlProvided = getProvidedURLs(searchOnProviders, searchOnAWebSite)

    if (returnSearchResults) {
      return {
        prompt: search_results,
        source: urlProvided.map((result) => {
          return {
            url: result.url,
            name: getHostName(result.url),
            type: "url"
          }
        })
      }
    }

    const current_date_time = new Date().toLocaleString()

    const system = await getWebSearchPrompt()

    const prompt = system
      .replace("{current_date_time}", current_date_time)
      .replace("{search_results}", search_results)
      .replace("{query}", query)


    return {
      prompt,
      source: urlProvided.map((result) => {
        return {
          url: result.url,
          name: getHostName(result.url),
          type: "url"
        }
      })
    }
  } catch (e) {
    console.error(e)
    return {
      prompt: "",
      source: []
    }
  }
}
