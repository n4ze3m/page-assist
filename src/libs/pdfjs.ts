import type * as PdfJsType from "pdfjs-dist"
// Let Vite/WXT emit the worker script as an asset and use its URL.
// This avoids assigning the module object itself to workerSrc, which must be a string.
// eslint-disable-next-line import/no-unresolved
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url"

let cachedPdfDist: typeof PdfJsType | null = null

export const getPdfDist = async (): Promise<typeof PdfJsType> => {
  if (cachedPdfDist) {
    return cachedPdfDist
  }

  const pdfDistModule = await import("pdfjs-dist")
  const pdfDist = pdfDistModule as unknown as typeof PdfJsType

  // Configure the worker script once with the emitted URL string.
  ;(pdfDist as any).GlobalWorkerOptions.workerSrc = workerSrc

  cachedPdfDist = pdfDist
  return pdfDist
}
