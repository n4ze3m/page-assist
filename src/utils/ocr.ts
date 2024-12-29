import { createWorker } from 'tesseract.js';

export async function processImageForOCR(imageData: string): Promise<string> {
    const worker = await createWorker('eng-fast', undefined, {
        workerPath: "/ocr/worker.min.js",
        workerBlobURL: false,
        corePath: "/ocr/tesseract-core-simd.js",
        errorHandler: e => console.error(e),
        langPath: "/ocr/lang"
    });

    const result = await worker.recognize(imageData);

    await worker.terminate();

    return result.data.text;
}
