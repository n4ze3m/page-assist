import assert from "node:assert/strict"
import { test } from "node:test"
import { parseGoogleResults } from "../src/web/search-engines/google-parser.ts"

const modernResult = (href: string, title = "Local weather") => `
  <div class="wHYlTd Ww4FFb tF2Cxc asEBEc vt6azd">
    <a href="https://example.net/menu">Result menu</a>
    <a href="${href}"><h3>${title}</h3></a>
    <span>Morning showers</span><span>Clear by evening</span>
  </div>`

const legacyResult = `
  <div class="g">
    <a href="https://example.com/library">Visit website</a>
    <h3>Local library</h3>
    <span>Open on Saturday</span>
  </div>`

test("extracts newer Google results and chooses the result heading's link", () => {
  assert.deepEqual(
    parseGoogleResults(modernResult("https://example.com/weather")),
    [
      {
        title: "Local weather",
        link: "https://example.com/weather",
        content: "Morning showers Clear by evening"
      }
    ]
  )
})

test("keeps legacy results and deduplicates nested and repeated hits in order", () => {
  const modern = modernResult("https://example.com/weather")
  assert.deepEqual(
    parseGoogleResults(
      `<div class="g">${modern}</div>` + legacyResult + modern
    ),
    [
      {
        title: "Local weather",
        link: "https://example.com/weather",
        content: "Morning showers Clear by evening"
      },
      {
        title: "Local library",
        link: "https://example.com/library",
        content: "Open on Saturday"
      }
    ]
  )
})

test("skips incomplete hits and invalid links without losing valid results", () => {
  const incomplete =
    '<div class="g"><a href="https://example.com/menu">Menu</a></div>'
  const headingWithoutLink = '<div class="tF2Cxc"><h3>No link</h3></div>'
  const malformed = modernResult("http://")
  const nonWeb = modernResult("mailto:help@example.com")
  assert.deepEqual(
    parseGoogleResults(
      incomplete + headingWithoutLink + malformed + nonWeb + legacyResult
    ),
    [
      {
        title: "Local library",
        link: "https://example.com/library",
        content: "Open on Saturday"
      }
    ]
  )
})

test("returns no results when no matching result container is present", () => {
  assert.deepEqual(
    parseGoogleResults("<main><h3>Other heading</h3></main>"),
    []
  )
})
