import { cleanUrl } from "~libs/clean-url"
import { chromeRunTime } from "~libs/runtime"

const BLOCKED_HOSTS = [
  "google.com",
  "youtube.com",
  "twitter.com",
]

export const localGoogleSearch = async (query: string) => {
  await chromeRunTime(
    cleanUrl("https://www.google.com/search?hl=en&q=" + query)
  )
  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 10000)

  const htmlString = await fetch(
    "https://www.google.com/search?hl=en&q=" + query,
    {
      signal: abortController.signal
    }
  )
    .then((response) => response.text())
    .catch()

  const parser = new DOMParser()

  const doc = parser.parseFromString(htmlString, "text/html")

  const searchResults = Array.from(doc.querySelectorAll("div.g")).map(
    (result) => {
      const title = result.querySelector("h3")?.textContent
      const link = result.querySelector("a")?.getAttribute("href")
      return { title, link }
    }
  )
  const filteredSearchResults = searchResults
    .filter(
      (result) =>
        !result.link ||
        !BLOCKED_HOSTS.some((host) => result.link.includes(host))
    )
    .filter((result) => result.title && result.link)
  return filteredSearchResults
}
