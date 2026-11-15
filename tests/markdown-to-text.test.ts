import assert from "node:assert/strict"
import { test } from "node:test"
import { markdownToText } from "../src/utils/markdown-to-text.ts"

test("speaks an image's alt text instead of a leading exclamation mark", () => {
  assert.equal(
    markdownToText("See ![diagram](https://example.com/a.png) please."),
    "See diagram please."
  )
})

test("drops images that have no alt text instead of reading the URL", () => {
  assert.equal(markdownToText("Before ![](pic.png) after."), "Before  after.")
})

test("keeps link text when an image and a link are in the same sentence", () => {
  assert.equal(markdownToText("![chart](c.png) and [docs](https://example.com)"), "chart and docs")
})

test("still removes emphasis, headings, and fenced code", () => {
  assert.equal(
    markdownToText("# Title\n\n**bold** and *italic*\n\n```js\nconst x = 1\n```\nDone."),
    "Title\n\nbold and italic\n\nDone."
  )
})
