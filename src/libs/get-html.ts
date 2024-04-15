import { defaultExtractContent } from "@/parser/default"
import { getPdf } from "./pdf"
import {
  isTweet,
  isTwitterTimeline,
  parseTweet,
  parseTwitterTimeline,
} from "@/parser/twitter"
import { isGoogleDocs, parseGoogleDocs } from "@/parser/google-docs"
import { cleanUnwantedUnicode } from "@/utils/clean"

const _getHtml = () => {
  const url = window.location.href
  if (document.contentType === "application/pdf") {
    return { url, content: "", type: "pdf" }
  }

  return {
    content: document.documentElement.outerHTML,
    url,
    type: "html"
  }
}

export const getDataFromCurrentTab = async () => {
  const result = new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]

      const data = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: _getHtml
      })

      if (data.length > 0) {
        resolve(data[0].result)
      }
    })
  }) as Promise<{
    url: string
    content: string
    type: string
  }>

  const { content, type, url } = await result

  if (type === "pdf") {
    const res = await fetch(url)
    const data = await res.arrayBuffer()
    let pdfHtml: {
      content: string
      page: number
    }[] = []
    const pdf = await getPdf(data)

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()

      if (content?.items.length === 0) {
        continue
      }

      const text = content?.items
        .map((item: any) => item.str)
        .join("\n")
        .replace(/\x00/g, "")
        .trim()
      pdfHtml.push({
        content: text,
        page: i
      })
    }

    return {
      url,
      content: "",
      pdf: pdfHtml,
      type: "pdf"
    }
  }
  if (isTwitterTimeline(url)) {
    const data = parseTwitterTimeline(content)
    return {
      url,
      content: data,
      type: "html",
      pdf: []
    }
  } else if (isTweet(url)) {
    const data = parseTweet(content)
    return {
      url,
      content: data,
      type: "html",
      pdf: []
    }
  } else if (isGoogleDocs(url)) {
    const data = await parseGoogleDocs()
    if (data) {
      return {
        url,
        content: cleanUnwantedUnicode(data),
        type: "html",
        pdf: []
      }
    }
  }
  const data = defaultExtractContent(content)
  return { url, content: data, type, pdf: [] }
}
