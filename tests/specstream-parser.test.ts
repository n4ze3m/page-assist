import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildSpecStreamSearchUrl,
  parseSpecStreamResults
} from "../src/web/search-engines/specstream-parser.ts"

test("builds the search url and encodes the query", () => {
  assert.equal(
    buildSpecStreamSearchUrl("page assist & friends", false),
    "https://api.specstream.ai/v1/web-search?q=page+assist+%26+friends"
  )
})

test("asks for passages when requested", () => {
  assert.equal(
    buildSpecStreamSearchUrl("a", true),
    "https://api.specstream.ai/v1/web-search?q=a&passages=true"
  )
})

test("cuts the question at 2000 characters", () => {
  const url = new URL(buildSpecStreamSearchUrl("x".repeat(2500), false))
  assert.equal(url.searchParams.get("q")?.length, 2000)
})

test("prefers the passage text and falls back to the snippet", () => {
  const results = parseSpecStreamResults({
    data: {
      sources: [
        { title: "One", url: "https://example.com/1", snippet: "short one" },
        { title: "Two", url: "https://example.com/2", snippet: "short two" }
      ],
      passages: [{ url: "https://example.com/1", text: "long page text" }]
    }
  })
  assert.deepEqual(results, [
    { title: "One", link: "https://example.com/1", content: "long page text" },
    { title: "Two", link: "https://example.com/2", content: "short two" }
  ])
})

test("skips sources without a url and tolerates an empty reply", () => {
  assert.deepEqual(
    parseSpecStreamResults({ data: { sources: [{ title: "No link" }] } }),
    []
  )
  assert.deepEqual(parseSpecStreamResults({}), [])
})

test("keeps at most 4000 characters of page text", () => {
  const [result] = parseSpecStreamResults({
    data: {
      sources: [{ url: "https://example.com", title: "T" }],
      passages: [{ url: "https://example.com", text: "y".repeat(5000) }]
    }
  })
  assert.equal(result.content.length, 4000)
})
