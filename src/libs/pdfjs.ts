import type * as PdfJsType from "pdfjs-dist"

let cachedPdfDist: typeof PdfJsType | null = null

export const getPdfDist = async (): Promise<typeof PdfJsType> => {
  if (cachedPdfDist) {
    return cachedPdfDist
  }

  const [pdfDistModule, pdfWorkerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.mjs")
  ])

  const pdfDist = pdfDistModule as unknown as typeof PdfJsType

  // Match previous behaviour: configure the worker script once.
  ;(pdfDist as any).GlobalWorkerOptions.workerSrc = pdfWorkerModule

  cachedPdfDist = pdfDist
  return pdfDist
}
