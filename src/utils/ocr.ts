import { createWorker } from "tesseract.js"

export async function processImageForOCR(imageData: string): Promise<string> {
    try {
        const isOCROffline = import.meta.env.BROWSER === "edge"
        const worker = await createWorker(!isOCROffline ? "eng-fast" : "eng", undefined, {
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
