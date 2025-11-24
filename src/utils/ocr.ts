import { getOCRLanguageToUse, isOfflineOCR, isOcrEnabled } from "@/services/ocr"
import { createWorker } from "pa-tesseract.js"

const OCR_CDN_BASE = "https://cdn.jsdelivr.net/npm/pa-tesseract.js@5.1.1/dist"

export async function processImageForOCR(imageData: string): Promise<string> {
    try {
        const enabled = await isOcrEnabled()
        if (!enabled) {
            console.warn("[tldw Assistant] OCR assets are disabled. Enable OCR in Settings to use this feature.")
            return ""
        }

        const lang = await getOCRLanguageToUse() 
        const isOCROffline = isOfflineOCR(lang)

        const workerPath = `${OCR_CDN_BASE}/worker.min.js`
        const corePath = `${OCR_CDN_BASE}/tesseract-core-simd.js`
        const langPath = `${OCR_CDN_BASE}/lang`

        const worker = await createWorker(lang, undefined, {
            workerPath,
            workerBlobURL: false,
            corePath,
            errorHandler: (e) => console.error(e),
            langPath: !isOCROffline ? langPath : undefined
        })

        const result = await worker.recognize(imageData)

        await worker.terminate()

        return result.data.text
    } catch (error) {
        console.error("Error processing image for OCR:", error)
        return ""
    }
}
