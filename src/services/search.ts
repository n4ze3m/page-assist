import { Storage } from "@plasmohq/storage"

const storage = new Storage()

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

export const getSearchSettings = async () => {
  const [isSimpleInternetSearch, searchProvider, totalSearchResult] =
    await Promise.all([
      getIsSimpleInternetSearch(),
      getSearchProvider(),
      totalSearchResults()
    ])

  return {
    isSimpleInternetSearch,
    searchProvider,
    totalSearchResults: totalSearchResult
  }
}

export const setSearchSettings = async ({
  isSimpleInternetSearch,
  searchProvider,
  totalSearchResults
}: {
  isSimpleInternetSearch: boolean
  searchProvider: string
  totalSearchResults: number
}) => {
  await Promise.all([
    setIsSimpleInternetSearch(isSimpleInternetSearch),
    setSearchProvider(searchProvider),
    setTotalSearchResults(totalSearchResults)
  ])
}
