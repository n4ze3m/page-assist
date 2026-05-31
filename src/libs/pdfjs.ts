import * as pdfDist from "pdfjs-dist"

/* See this threads
 https://github.com/mozilla/pdf.js/discussions/18213
 https://github.com/wojtekmaj/react-pdf/tree/35f5acc80776bc20f504234641d121cceeb0c311?tab=readme-ov-file#copy-worker-to-public-directory
*/

function getExtensionWorkerUrl() {
  // Prefer extension-safe absolute URL if available
  try {
    const maybeChrome = (globalThis as any).chrome
    if (maybeChrome?.runtime?.getURL) {
      return maybeChrome.runtime.getURL('pdf.worker.min.mjs')
    }
  } catch {}
  try {
    const maybeBrowser = (globalThis as any).browser
    if (maybeBrowser?.runtime?.getURL) {
      return maybeBrowser.runtime.getURL('pdf.worker.min.mjs')
    }
  } catch {}
  // Fallback for dev servers or non-extension environments
  return '/pdf.worker.min.mjs'
}

pdfDist.GlobalWorkerOptions.workerSrc = getExtensionWorkerUrl();

export { pdfDist }
