Summary

  This extension is a frontend for a self‑hosted backend (tldw_server). It does not send data to third‑party cloud services by itself; it talks only to the user‑configured server URL and uses
  browser‑local storage for UI preferences.

  The remaining linter warnings are about:

  - Wasm and Function usage inside third‑party OCR/PDF libraries, and
  - DOM insertion helpers that are now protected by DOMPurify.

  Below are the details.

  ———

  Data collection

  - The extension does not collect analytics or behavioral data for the developer.
  - Requests are made only to the user‑configured tldw_server URL (e.g. <http://localhost:8000> or a server they control).
  - We store only functional preferences in chrome.storage / browser.storage (e.g. server URL, UI settings, feature toggles).
  - No credentials or API keys are transmitted to third parties; for “single‑user” mode the user can optionally configure an API key that is sent only to their own tldw_server.

  ———

  Content Security Policy and wasm

  - The CSP includes 'wasm-unsafe-eval' and allows worker scripts from blob: because we use:
    - pa-tesseract.js (OCR) in ocr/worker.min.js and ocr/tesseract-core-simd.wasm, and
    - pdfjs-dist for client‑side PDF text extraction.
  - These libraries rely on WebAssembly and internal Function usage for their own runtime; we do not use eval / Function to execute arbitrary content from the web page or from users.
  - For pdf.js we explicitly disable JavaScript execution inside PDFs by calling:

    pdfDist.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    })

    so embedded PDF JavaScript is never executed.

  ———

  DANGEROUS_EVAL and UNSAFE_VAR_ASSIGNMENT warnings

  - The DANGEROUS_EVAL warnings flagged by addons‑linter correspond to:
    - Minified OCR worker code in ocr/worker.min.js
    - The pdf.js worker chunk chunks/pdf.worker-*.js
  - These are third‑party libraries, running either:
    - In a web worker (pdf.js, Tesseract), or
    - Against data we control, not arbitrary content from web pages.
  - Our own application code does not use eval or new Function for user or page content.

  For DOM insertion:

  - We previously had a few places that used innerHTML/outerHTML. These have been either:
    - Removed (e.g., the HuggingFace content script now uses DOM node APIs to change the SVG icon), or
    - Automatically rewritten by a Vite plugin to a helper __setSafeInnerHTML(...).
  - That helper now sanitizes all HTML with DOMPurify before it is parsed:

    import DOMPurifyInit from "dompurify";
    const DOMPurify = DOMPurifyInit(window);

    const __setSafeInnerHTML = (el, html) => {
      if (!el) return;
      const raw = html?.valueOf?.() ?? html ?? "";
      const sanitized = DOMPurify.sanitize(String(raw), { RETURN_TRUSTED_TYPE: false });
      // …then insert via Range.createContextualFragment(sanitized)
    };
  - So even where the linter sees createContextualFragment, the string going in has already been sanitized.

  ———

  Browser‑specific APIs

  - The Chromium chrome.sidePanel API is used only in Chromium builds. For Firefox builds we gate this at compile time and use browser.sidebarAction.open() instead.
  - That is why there are no remaining UNSUPPORTED_API: sidePanel.open warnings in the Firefox bundle.

  ———
