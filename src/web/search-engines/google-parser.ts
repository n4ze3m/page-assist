import * as cheerio from "cheerio"

const resultSelector = "div.g, div.tF2Cxc"

export const parseGoogleResults = (htmlString: string) => {
  const $ = cheerio.load(htmlString)
  const seenLinks = new Set<string>()

  return Array.from($(resultSelector)).flatMap((result) => {
    // Google can nest a newer result inside a legacy wrapper. Only parse the
    // heading from its own container so a wrapper doesn't produce another hit.
    const heading = $(result)
      .find("h3")
      .filter((_, node) => $(node).closest(resultSelector).get(0) === result)
      .first()
    const title = heading.text().trim()
    if (!title) return []

    const link = (
      heading.closest("a[href]").attr("href") ??
      $(result).find("a[href]").first().attr("href")
    )?.trim()
    if (!link || seenLinks.has(link)) return []

    try {
      const { protocol } = new URL(link)
      if (protocol !== "http:" && protocol !== "https:") return []
    } catch {
      return []
    }

    seenLinks.add(link)
    const content = $(result)
      .find("span")
      .map((_, span) => $(span).text())
      .get()
      .join(" ")
    return [{ title, link, content }]
  })
}
