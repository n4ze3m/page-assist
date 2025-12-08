import { apiSend } from "@/services/api-send"
import type { AllowedPath } from "@/services/tldw/openapi-guard"
import { browser } from "wxt/browser"

const MAX_ERROR_MESSAGE_LENGTH = 140

type I18nKey =
  | "contextSendToTldw"
  | "contextSendingToTldw"
  | "hfSendPageErrorWithDetail"
  | "hfSendPageError"
  | "hfSendPageSuccess"
  | "hfInvalidPage"
  | "hfSendPageException"

const getMessage = (
  key: I18nKey,
  fallback: string,
  substitutions?: string | string[]
) => {
  try {
    const msg = browser.i18n?.getMessage(
      key as Parameters<typeof browser.i18n.getMessage>[0],
      substitutions
    )
    if (msg && msg.length > 0) return msg
  } catch {
    // ignore
  }
  return fallback
}

export default defineContentScript({
  main() {
    const sendToTldw = async (btn?: HTMLButtonElement) => {
      const labelEl = btn?.querySelector("span")
      const originalDisabled = btn?.disabled ?? false
      const originalLabel = labelEl?.textContent

      const url = window.location.href
      // Only send model, dataset, or space pages, not search results or settings.
      const isValidPath = /^https?:\/\/huggingface\.co\/[^/]+\/[^/]+(\/|$)/.test(
        url
      )
      if (!isValidPath) {
        alert(
          getMessage(
            "hfInvalidPage",
            "This page cannot be sent to tldw_server."
          )
        )
        return
      }
      // The path is declared in the OpenAPI spec; annotate for compile-time safety
      const path = '/api/v1/media/add' as AllowedPath

      try {
        if (btn) {
          btn.disabled = true
          const sendingLabel = getMessage(
            "contextSendingToTldw",
            "Sending…"
          )
          if (labelEl) {
            labelEl.textContent = sendingLabel
          }
        }
      } catch {
        // If we fail to update button UI, continue with the send anyway.
      }

      try {
        const resp = await apiSend<unknown>({
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
          const errorText =
            typeof resp?.error === "string" ? resp.error : undefined
          const msg =
            errorText && errorText.length <= MAX_ERROR_MESSAGE_LENGTH
              ? getMessage(
                  "hfSendPageErrorWithDetail",
                  `[tldw] Failed to send this page to tldw_server: ${errorText}. Check Settings → tldw server and try again.`,
                  [errorText]
                )
              : getMessage(
                  "hfSendPageError",
                  "[tldw] Failed to send this page to tldw_server. Check Settings → tldw server and try again."
                )
          alert(msg)
          return
        }

        alert(
          getMessage(
            "hfSendPageSuccess",
            "[tldw] Sent page to tldw_server for processing"
          )
        )
      } catch (error) {
        console.error(
          "[tldw] Failed to send page to tldw_server for processing",
          error
        )
        alert(
          getMessage(
            "hfSendPageException",
            "[tldw] Something went wrong while sending this page to tldw_server. Check that your tldw_server and the extension are running, then try again."
          )
        )
      } finally {
        if (btn) {
          btn.disabled = originalDisabled
          if (labelEl && originalLabel !== undefined) {
            labelEl.textContent = originalLabel
          }
        }
      }
    }

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
      if (!document.body) return
      if (document.querySelector(".tldw-send-button")) return
      const btn = document.createElement('button')
      btn.className =
        "tldw-send-button inline-flex cursor-pointer items-center text-sm bg-white shadow-xs rounded-md border px-2 py-1 text-gray-600"
      const sendLabel = getMessage("contextSendToTldw", "Send to tldw_server")
      btn.title = sendLabel
      const icon = createDownloadIcon()
      const label = document.createElement("span")
      label.classList.add("ml-1.5")
      label.textContent = sendLabel
      btn.append(icon, label)
      btn.style.position = "fixed"
      btn.style.bottom = "60px"
      btn.style.right = "20px"
      btn.style.zIndex = "9999"
      btn.addEventListener('click', () => void sendToTldw(btn))
      document.body.appendChild(btn)
    }

    if (document.body) {
      injectButton()
    } else {
      const observer = new MutationObserver(() => {
        if (document.body) {
          injectButton()
          observer.disconnect()
        }
      })
      observer.observe(document.documentElement, {
        childList: true
      })
    }
  },
  allFrames: false,
  matches: ["*://huggingface.co/*"]
})
