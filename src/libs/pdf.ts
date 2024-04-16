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
