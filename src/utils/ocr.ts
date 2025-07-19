import { getOCRLanguageToUse, isOfflineOCR } from "@/services/ocr"
import { createWorker } from "pa-tesseract.js"

export async function processImageForOCR(imageData: string): Promise<string> {
    try {
        const lang = await getOCRLanguageToUse() 
        const isOCROffline = isOfflineOCR(lang)
        
        const worker = await createWorker(lang, undefined, {
            workerPath: "/ocr/worker.min.js",
            workerBlobURL: false,
            corePath: "/ocr/tesseract-core-simd.js",
            errorHandler: (e) => console.error(e),
            langPath: !isOCROffline ? "/ocr/lang" : undefined
        })

        const result = await worker.recognize(imageData)

        await worker.terminate()

        return result.data.text
    } catch (error) {
        console.error("Error processing image for OCR:", error)
        return ""
    }
}
