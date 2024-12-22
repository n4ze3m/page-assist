import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const storage2 = new Storage({
  area: "local"
})

const TOTAL_SEARCH_RESULTS = 2
const DEFAULT_PROVIDER = "google"

const AVAILABLE_PROVIDERS = ["google", "duckduckgo"] as const

export const getIsSimpleInternetSearch = async () => {
  const isSimpleInternetSearch = await storage.get("isSimpleInternetSearch")
  if (!isSimpleInternetSearch || isSimpleInternetSearch.length === 0) {
    return true
  }
  return isSimpleInternetSearch === "true"
}

export const getIsVisitSpecificWebsite = async () => {
  const isVisitSpecificWebsite = await storage.get("isVisitSpecificWebsite")
  if (!isVisitSpecificWebsite || isVisitSpecificWebsite.length === 0) {
    return true
  }
  return isVisitSpecificWebsite === "true"
}


export const setIsVisitSpecificWebsite = async (
  isVisitSpecificWebsite: boolean
) => {
  await storage.set("isVisitSpecificWebsite", isVisitSpecificWebsite.toString())
}

export const setIsSimpleInternetSearch = async (
  isSimpleInternetSearch: boolean
) => {
  await storage.set("isSimpleInternetSearch", isSimpleInternetSearch.toString())
}

export const getSearchProvider = async (): Promise<
  (typeof AVAILABLE_PROVIDERS)[number]
> => {
  const searchProvider = await storage.get("searchProvider")
  if (!searchProvider || searchProvider.length === 0) {
    return DEFAULT_PROVIDER
  }
  return searchProvider as (typeof AVAILABLE_PROVIDERS)[number]
}

export const setSearchProvider = async (searchProvider: string) => {
  await storage.set("searchProvider", searchProvider)
}

export const totalSearchResults = async () => {
  const totalSearchResults = await storage.get("totalSearchResults")
  if (!totalSearchResults || totalSearchResults.length === 0) {
    return TOTAL_SEARCH_RESULTS
  }
  return parseInt(totalSearchResults)
}

export const setTotalSearchResults = async (totalSearchResults: number) => {
  await storage.set("totalSearchResults", totalSearchResults.toString())
}

export const getSearxngURL = async () => {
  const searxngURL = await storage.get("searxngURL")
  return searxngURL || ""
}

export const isSearxngJSONMode = async () => {
  const searxngJSONMode = await storage.get<boolean>("searxngJSONMode")
  return searxngJSONMode ?? false
}

export const setSearxngJSONMode = async (searxngJSONMode: boolean) => {
  await storage.set("searxngJSONMode", searxngJSONMode)
}

export const setSearxngURL = async (searxngURL: string) => {
  await storage.set("searxngURL", searxngURL)
}

export const getBraveApiKey = async () => {
  const braveApiKey = await storage2.get("braveApiKey")
  return braveApiKey || ""
}

export const setBraveApiKey = async (braveApiKey: string) => {
  await storage2.set("braveApiKey", braveApiKey)
}

export const getGoogleDomain = async () => {
  const domain = await storage2.get("searchGoogleDomain")
  return domain || "google.com"
}

export const setGoogleDomain = async (domain: string) => {
  await storage2.set("searchGoogleDomain", domain)
}

export const getSearchSettings = async () => {
  const [isSimpleInternetSearch, searchProvider, totalSearchResult, visitSpecificWebsite,
    searxngURL,
    searxngJSONMode,
    braveApiKey,
    googleDomain
  ] =
    await Promise.all([
      getIsSimpleInternetSearch(),
      getSearchProvider(),
      totalSearchResults(),
      getIsVisitSpecificWebsite(),
      getSearxngURL(),
      isSearxngJSONMode(),
      getBraveApiKey(),
      getGoogleDomain()
    ])

  return {
    isSimpleInternetSearch,
    searchProvider,
    totalSearchResults: totalSearchResult,
    visitSpecificWebsite,
    searxngURL,
    searxngJSONMode,
    braveApiKey,
    googleDomain
  }
}

export const setSearchSettings = async ({
  isSimpleInternetSearch,
  searchProvider,
  totalSearchResults,
  visitSpecificWebsite,
  searxngJSONMode,
  searxngURL,
  braveApiKey,
  googleDomain
}: {
  isSimpleInternetSearch: boolean
  searchProvider: string
  totalSearchResults: number
  visitSpecificWebsite: boolean
  searxngURL: string
  searxngJSONMode: boolean,
  braveApiKey: string,
  googleDomain: string
}) => {
  await Promise.all([
    setIsSimpleInternetSearch(isSimpleInternetSearch),
    setSearchProvider(searchProvider),
    setTotalSearchResults(totalSearchResults),
    setIsVisitSpecificWebsite(visitSpecificWebsite),
    setSearxngJSONMode(searxngJSONMode),
    setSearxngURL(searxngURL),
    setBraveApiKey(braveApiKey),
    setGoogleDomain(googleDomain)
  ])
}
