import * as cheerio from "cheerio"
import { defaultExtractContent } from "./default"

export const isWikipedia = (url: string) => {
  const WIKI_REGEX = /wikipedia\.org\/wiki\//g
  return WIKI_REGEX.test(url)
}

export const parseWikipedia = (html: string) => {
  if (!html) {
    return ""
  }
  const $ = cheerio.load(html)
  const title = $("h1#firstHeading")
  const content = $("#mw-content-text")
  content?.find("sup.reference")?.remove()
  content?.find("div.thumb")?.remove()
  content?.find("div.reflist")?.remove()
  content?.find("div.navbox")?.remove()
  content?.find("table.infobox")?.remove()
  content?.find("div.sister-wikipedia")?.remove()
  content?.find("div.sister-projects")?.remove()
  content?.find("div.metadata")?.remove()
  content?.find("div.vertical-navbox")?.remove()
  content?.find("div.toc")?.remove()
  const newHtml = content?.html()

  return defaultExtractContent(`<div>TITLE: ${title?.text()}</div><div>${newHtml}</div>`)
}
