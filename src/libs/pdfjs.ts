import * as pdfDist from "pdfjs-dist"
import * as pdfWorker from "pdfjs-dist/build/pdf.worker.mjs";

pdfDist.GlobalWorkerOptions.workerSrc = pdfWorker

export {
    pdfDist
}
