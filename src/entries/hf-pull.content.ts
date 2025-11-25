import { apiSend } from "@/services/api-send"
import type { AllowedPath } from "@/services/tldw/openapi-guard"

export default defineContentScript({
  main() {
    const sendToTldw = async () => {
      const url = window.location.href
      // The path is declared in the OpenAPI spec; annotate for compile-time safety
      const path = '/api/v1/media/add' as AllowedPath
      try {
        const resp = await apiSend({
          path,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { url }
        })

        if (!resp?.ok) {
          console.error(
            "[tldw] Page send request rejected by tldw_server",
            resp
          )
          const msg =
            resp.error && resp.error.length <= 140
              ? `[tldw] Failed to send this page to tldw_server: ${resp.error}. Check Settings → tldw server and try again.`
              : "[tldw] Failed to send this page to tldw_server. Check Settings → tldw server and try again."
          alert(msg)
          return
        }

        alert("[tldw] Sent page to tldw_server for processing")
      } catch (error) {
        console.error(
          "[tldw] Failed to send page to tldw_server for processing",
          error
        )
        alert(
          "[tldw] Something went wrong while sending this page to tldw_server. Check that your tldw_server and the extension are running, then try again."
        )
      }
    }

    const downloadSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
        <path d="M4 20h16v-2H4v2z"/>
      </svg>
    `

    const createDownloadIcon = () => {
      const ns = "http://www.w3.org/2000/svg"
      const svg = document.createElementNS(ns, "svg")
      svg.setAttribute("xmlns", ns)
      svg.setAttribute("fill", "currentColor")
      svg.setAttribute("viewBox", "0 0 24 24")
      svg.setAttribute("width", "16")
      svg.setAttribute("height", "16")

      const path1 = document.createElementNS(ns, "path")
      path1.setAttribute("d", "M12 16l-6-6h4V4h4v6h4l-6 6z")
      const path2 = document.createElementNS(ns, "path")
      path2.setAttribute("d", "M4 20h16v-2H4v2z")
      svg.append(path1, path2)
      return svg
    }

    const injectButton = () => {
      if (document.querySelector('.tldw-send-button')) return
      const btn = document.createElement('button')
      btn.className = 'tldw-send-button focus:outline-hidden inline-flex cursor-pointer items-center text-sm bg-white shadow-xs rounded-md border px-2 py-1 text-gray-600'
      btn.title = 'Send to tldw_server'
      const icon = createDownloadIcon()
      const label = document.createElement("span")
      label.classList.add("ml-1.5")
      label.textContent = "Send to tldw_server"
      btn.append(icon, label)
      btn.style.position = 'fixed'
      btn.style.bottom = '60px'
      btn.style.right = '20px'
      btn.style.zIndex = '2147483647'
      btn.addEventListener('click', sendToTldw)
      document.body.appendChild(btn)
    }

    const observer = new MutationObserver(() => injectButton())
    observer.observe(document.documentElement, { childList: true, subtree: true })
    injectButton()
  },
  allFrames: true,
  matches: ["*://huggingface.co/*"]
})
