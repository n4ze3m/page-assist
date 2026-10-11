import * as cheerio from "cheerio"

export const parseDuckDuckGoResults = (htmlString: string) => {
  const $ = cheerio.load(htmlString)

  return Array.from($("div.results_links_deep")).flatMap((result) => {
    const title = $(result).find("a.result__a").text()
    const href = $(result).find("a.result__snippet").attr("href")
    if (!href) return []

    const link = href
      .replace("//duckduckgo.com/l/?uddg=", "")
      .replace(/&rut=.*/, "")
    const content = $(result).find("a.result__snippet").text()
    try {
      return [{ title, link: decodeURIComponent(link), content }]
    } catch {
      // One malformed URL must not discard all the other search results.
      return []
    }
  })
}
