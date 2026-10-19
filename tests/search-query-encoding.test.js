import assert from "node:assert/strict"
import { afterEach, mock, spyOn, test } from "bun:test"

const rewrittenURLs = []
mock.module("@/libs/runtime", () => ({
  urlRewriteRuntime: async (url) => rewrittenURLs.push(url)
}))
mock.module("@/loader/html", () => ({ PageAssistHtmlLoader: class {} }))
mock.module("@/models/embedding", () => ({ pageAssistEmbeddingModel: mock() }))
mock.module("@/services/ollama", () => ({
  defaultEmbeddingModelForRag: mock(),
  getOllamaURL: async () => "http://localhost:11434",
  getSelectedModel: mock()
}))
mock.module("@/services/search", () => ({
  getIsSimpleInternetSearch: async () => true,
  totalSearchResults: async () => 5,
  getBraveApiKey: async () => "test-key"
}))
mock.module("@/utils/text-splitter", () => ({
  getPageAssistTextSplitter: mock()
}))
mock.module("@langchain/classic/vectorstores/memory", () => ({
  MemoryVectorStore: class {}
}))

const { localBingSearch } = await import("../src/web/search-engines/bing.ts")
const { localBraveSearch } = await import("../src/web/search-engines/brave.ts")
const { localDuckDuckGoSearch } = await import(
  "../src/web/search-engines/duckduckgo.ts"
)
const { localSogouSearch } = await import("../src/web/search-engines/sogou.ts")
const { braveAPISearch } = await import(
  "../src/web/search-engines/brave-api.ts"
)

afterEach(() => {
  mock.restore()
  rewrittenURLs.length = 0
})

for (const [name, search, parameter, rewrites] of [
  ["Bing", localBingSearch, "q", true],
  ["Brave", localBraveSearch, "q", true],
  ["DuckDuckGo", localDuckDuckGoSearch, "q", false],
  ["Sogou", localSogouSearch, "query", true],
  ["Brave API", braveAPISearch, "q", false]
]) {
  for (const query of [
    "plain query",
    "C++ & C# 100% café/搜索",
    "literal %23 and %26",
    "topic&count=99#details"
  ]) {
    test(`${name} preserves the query ${JSON.stringify(query)}`, async () => {
      const requests = []
      spyOn(globalThis, "setTimeout").mockImplementation(() => 0)
      spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        requests.push(new URL(url))
        return name === "Brave API"
          ? Response.json({ web: { results: [] } })
          : new Response("<html></html>")
      })

      await search(query)

      assert.equal(requests.length, 1)
      assert.equal(requests[0].searchParams.get(parameter), query)
      assert.equal(requests[0].hash, "")
      assert.deepEqual(
        [...requests[0].searchParams.keys()].sort(),
        name === "Brave API" ? ["count", "q"] : [parameter]
      )
      if (name === "Brave API") {
        assert.equal(requests[0].searchParams.get("count"), "5")
      }
      assert.deepEqual(
        rewrittenURLs.map((url) => new URL(url).href),
        rewrites ? [requests[0].href] : []
      )
    })
  }
}
