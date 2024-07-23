import * as cheerio from "cheerio"
import TurndownService from "turndown"
import { Readability, isProbablyReaderable } from "@mozilla/readability"

export const defaultExtractContent = (html: string) => {


  const doc = new DOMParser().parseFromString(html, "text/html")
  if (isProbablyReaderable(doc)) {
    const reader = new Readability(doc)
    const article = reader.parse()
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    })
    return turndownService.turndown(article.content).trim()
  }

  const $ = cheerio.load(html)

  $('script, style, link, svg, [src^="data:image/"]').remove()

  $('*').each((_, element) => {
    if ('attribs' in element) {
      const attributes = element.attribs
      for (const attr in attributes) {
        if (attr !== 'href' && attr !== 'src') {
          $(element).removeAttr(attr)
        }
      }
    }
  })

  const mainContent = $('[role="main"]').html() || $("main").html() || $("body").html() || ""

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  })
  const markdown = turndownService.turndown(mainContent)

  return markdown.trim()
}
