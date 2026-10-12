import { defaultExtractContent } from "./default"
import { getPdf } from "@/libs/pdf"
import { isPdfResponse } from "./pdf-url"

const extractPdfText = async (data: ArrayBuffer): Promise<string> => {
  const pdf = await getPdf(data)
  let pdfText = ""

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

    if (text) {
      pdfText += (pdfText ? "\n\n" : "") + text
    }
  }

  return pdfText
}

export const extractReadabilityContent = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0"
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  if (isPdfResponse(response, url)) {
    const data = await response.arrayBuffer()
    return extractPdfText(data)
  }

  const html = await response.text()
  return defaultExtractContent(html, url)
}
