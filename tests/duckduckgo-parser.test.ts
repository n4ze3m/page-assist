import assert from "node:assert/strict"
import { test } from "node:test"
import { parseDuckDuckGoResults } from "../src/web/search-engines/duckduckgo-parser.ts"

const result = (href?: string) => `
  <div class="results_links_deep">
    <a class="result__a">Example</a>
    <a class="result__snippet"${href === undefined ? "" : ` href="${href}"`}>Snippet</a>
  </div>`
const valid = result(
  "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F&amp;rut=tracking"
)
const expected = [
  { title: "Example", link: "https://example.com/", content: "Snippet" }
]

test("decodes redirect links and removes DuckDuckGo tracking", () => {
  assert.deepEqual(parseDuckDuckGoResults(valid), expected)
})

for (const [label, href] of [
  ["missing", undefined],
  ["empty", ""],
  [
    "invalid percent encoding",
    "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F%ZZ"
  ]
] as const) {
  test(`skips ${label} href without losing subsequent valid results`, () => {
    assert.deepEqual(parseDuckDuckGoResults(result(href) + valid), expected)
  })
}

test("does not fail if the snippet anchor itself is missing", () => {
  assert.deepEqual(
    parseDuckDuckGoResults('<div class="results_links_deep"></div>' + valid),
    expected
  )
})

test("handles an empty results page", () => {
  assert.deepEqual(parseDuckDuckGoResults("<html></html>"), [])
})

test("retains valid results in their original order", () => {
  const second = result("https://second.example/")
  assert.deepEqual(
    parseDuckDuckGoResults(valid + second).map((r) => r.link),
    ["https://example.com/", "https://second.example/"]
  )
})

test("decodes encoded quotes in search result URLs", () => {
  assert.equal(
    parseDuckDuckGoResults(
      result(
        "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F%3Fq%3D%22hello%22"
      )
    )[0].link,
    'https://example.com/?q="hello"'
  )
})
