import { pdfDist } from "./pdfjs"

export const getPdf = async (data: ArrayBuffer) => {
  const pdf = pdfDist.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  })

  pdf.onPassword = (callback: any) => {
    const password = prompt("Enter the password: ")
    if (!password) {
      throw new Error("Password required to open the PDF.")
    }
    callback(password)
  }

  const pdfDocument = await pdf.promise

  return pdfDocument
}

export const processPdf = async (base64: string) => {
  const res = await fetch(base64)
  const data = await res.arrayBuffer()
  const pdf = await getPdf(data)
  return pdf
}


export const processPDFFromURL = async (url: string) => {
  const res = await fetch(url)
  const data = await res.arrayBuffer()
  const pdf = await getPdf(data)
  let pdfText = '';

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

    pdfText += text;
  }

  return pdfText;

}