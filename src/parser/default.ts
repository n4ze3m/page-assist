import * as cheerio from "cheerio"
import TurndownService from "turndown"
let turndownService = new TurndownService()

export const defaultExtractContent = (html: string) => {
  const $ = cheerio.load(html)
  const mainContent = $('[role="main"]').html() || $("main").html() || $.html()
  const markdown = turndownService.turndown(mainContent)
  return markdown
}
