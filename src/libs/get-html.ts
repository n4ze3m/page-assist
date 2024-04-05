import { getPdf } from "./pdf"

const _getHtml = async () => {
  const url = window.location.href
  if (document.contentType === "application/pdf") {
    return { url, content: "", type: "pdf" }
  }
  const html = Array.from(document.querySelectorAll("script")).reduce(
    (acc, script) => {
      return acc.replace(script.outerHTML, "")
    },
    document.documentElement.outerHTML
  )
  return { url, content: html, type: "html" }
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
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      if (content?.items.length === 0) {
        continue;
      }

      const text = content?.items.map((item: any) => item.str).join("\n")
        .replace(/\x00/g, "").trim();
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

  return { url, content, type, pdf: [] }
}

