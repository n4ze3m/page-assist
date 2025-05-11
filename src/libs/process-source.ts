import { PageAssisCSVUrlLoader } from "@/loader/csv"
import { PageAssistDocxLoader } from "@/loader/docx"
import { PageAssistPDFUrlLoader } from "@/loader/pdf-url"
import { PageAssisTXTUrlLoader } from "@/loader/txt"

export const processSource = async ({
  type,
  url,
  filename
}: {
  url: string
  type: string
  filename: string
}) => {
  if (type === "pdf" || type === "application/pdf") {
    const loader = new PageAssistPDFUrlLoader({
      name: filename,
      url: url
    })
    let docs = await loader.load()
    return docs.map((e) => e.pageContent).join("\n")
  } else if (type === "csv" || type === "text/csv") {
    const loader = new PageAssisCSVUrlLoader({
      name: filename,
      url: url,
      options: {}
    })

    let docs = await loader.load()

    return docs.map((e) => e.pageContent).join("\n")
  } else if (
    type === "docx" ||
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const loader = new PageAssistDocxLoader({
        fileName: filename,
        buffer: await toArrayBufferFromBase64(url)
      })

      let docs = await loader.load()

      return docs.map((e) => e.pageContent).join("\n")
    } catch (error) {
      console.error(`Error loading docx file: ${error}`)
    }
  } else {
    const loader = new PageAssisTXTUrlLoader({
      name: filename,
      url: url
    })

    let docs = await loader.load()

    return docs.map((e) => e.pageContent).join("\n")
  }
}
