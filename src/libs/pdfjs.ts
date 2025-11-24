import type * as PdfJsType from "pdfjs-dist"

let cachedPdfDist: typeof PdfJsType | null = null
const PDF_WORKER_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js"

export const getPdfDist = async (): Promise<typeof PdfJsType> => {
  if (cachedPdfDist) {
    return cachedPdfDist
  }

  const pdfDistModule = await import("pdfjs-dist")
  const pdfDist = pdfDistModule as unknown as typeof PdfJsType

  if (!(pdfDist as any).GlobalWorkerOptions.workerSrc) {
    // Configure the worker script once with the CDN URL to avoid bundling the worker asset.
    ;(pdfDist as any).GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN
  }

  cachedPdfDist = pdfDist
  return pdfDist
}
