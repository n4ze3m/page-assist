import { apiSend } from "@/services/api-send"
import { API_PATHS } from "@/services/tldw/openapi-guard"
import { browser } from "wxt/browser"

const MAX_ERROR_MESSAGE_LENGTH = 140
const TOAST_Z_INDEX = 999999
const TOAST_AUTO_DISMISS_MS = 5000
const TOAST_ANIMATION_DURATION_MS = 180
const BUTTON_Z_INDEX = 9999

type ToastVariant = "success" | "error" | "info"

const showToast = (message: string, variant: ToastVariant = "info") => {
  if (typeof document === "undefined") {
    console.warn("[tldw] Toast message:", message)
    return
  }

  const containerId = "tldw-toast-container"
  let container = document.getElementById(containerId)

  if (!container) {
    container = document.createElement("div")
    container.id = containerId
    container.style.position = "fixed"
    container.style.zIndex = TOAST_Z_INDEX.toString()
    container.style.bottom = "16px"
    container.style.right = "16px"
    container.style.display = "flex"
    container.style.flexDirection = "column"
    container.style.gap = "8px"
    container.style.pointerEvents = "none"
    container.setAttribute("role", "status")
    container.setAttribute("aria-live", "polite")
    document.body.appendChild(container)
  }

  const toast = document.createElement("div")
  toast.textContent = message
  toast.style.maxWidth = "360px"
  toast.style.fontSize = "13px"
  toast.style.lineHeight = "1.4"
  toast.style.borderRadius = "9999px"
  toast.style.padding = "8px 12px"
  toast.style.display = "inline-flex"
  toast.style.alignItems = "center"
  toast.style.boxShadow =
    "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
  toast.style.pointerEvents = "auto"
  toast.style.cursor = "pointer"
  toast.style.opacity = "0"
  toast.style.transform = "translateY(6px)"
  toast.style.transition =
    "opacity 150ms ease-out, transform 150ms ease-out, filter 150ms ease-out"

  const variantStyles: Record<
    ToastVariant,
    { background: string; color: string }
  > = {
    success: {
      background: "rgba(22, 163, 74, 0.96)",
      color: "#ECFDF3"
    },
    error: {
      background: "rgba(220, 38, 38, 0.96)",
      color: "#FEF2F2"
    },
    info: {
      background: "rgba(15, 23, 42, 0.96)",
      color: "#E5E7EB"
    }
  }

  const styles = variantStyles[variant] || variantStyles.info
  toast.style.background = styles.background
  toast.style.color = styles.color

  const dismiss = () => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(6px)"
    toast.style.filter = "blur(0.5px)"
    window.setTimeout(() => {
      toast.remove()
      if (container && container.childElementCount === 0) {
        container.remove()
      }
    }, TOAST_ANIMATION_DURATION_MS)
  }

  toast.addEventListener("click", dismiss)

  container.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateY(0)"
    toast.style.filter = "blur(0)"
  })

  window.setTimeout(dismiss, TOAST_AUTO_DISMISS_MS)
}

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

const isValidHuggingFacePage = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url)
    const segments = parsedUrl.pathname.split("/").filter(Boolean)

    if (segments.length < 2) return false

    // /datasets/{owner}/{dataset} or /spaces/{owner}/{space}
    if (
      (segments[0] === "datasets" || segments[0] === "spaces") &&
      segments.length >= 3
    ) {
      return true
    }

    const excludedRoots = [
      "settings",
      "docs",
      "organizations",
      "tasks",
      "models",
      "datasets",
      "spaces"
    ]

    return !excludedRoots.includes(segments[0])
  } catch {
    return false
  }
}

export default defineContentScript({
  main() {
    const sendToTldw = async (btn?: HTMLButtonElement) => {
      const labelEl = btn?.querySelector("span")
      const originalDisabled = btn?.disabled ?? false
      const originalLabel = labelEl?.textContent

      const url = window.location.href
      // Only send model, dataset, or space pages, not search results or settings.
      if (!isValidHuggingFacePage(url)) {
        showToast(
          getMessage(
            "hfInvalidPage",
            "This page cannot be sent to tldw_server."
          ),
          "error"
        )
        return
      }
      const path = API_PATHS.MEDIA_ADD

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
          showToast(msg, "error")
          return
        }

        showToast(
          getMessage(
            "hfSendPageSuccess",
            "[tldw] Sent page to tldw_server for processing"
          ),
          "success"
        )
      } catch (error) {
        console.error(
          "[tldw] Failed to send page to tldw_server for processing",
          error
        )
        showToast(
          getMessage(
            "hfSendPageException",
            "[tldw] Something went wrong while sending this page to tldw_server. Check that your tldw_server and the extension are running, then try again."
          ),
          "error"
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
      const btn = document.createElement("button")
      btn.className =
        "tldw-send-button inline-flex cursor-pointer items-center text-sm bg-white shadow-xs rounded-md border px-2 py-1 text-gray-600"
      const sendLabel = getMessage("contextSendToTldw", "Send to tldw_server")
      btn.title = sendLabel
      const icon = createDownloadIcon()
      icon.setAttribute("aria-hidden", "true")
      const label = document.createElement("span")
      label.classList.add("ml-1.5")
      label.textContent = sendLabel
      btn.append(icon, label)
      btn.style.position = "fixed"
      btn.style.bottom = "60px"
      btn.style.right = "20px"
      btn.style.zIndex = BUTTON_Z_INDEX.toString()
      btn.addEventListener("click", () => void sendToTldw(btn))
      document.body.appendChild(btn)
    }

    const setupSpaNavigationListener = () => {
      const win = window as typeof window & {
        __tldwHfHistoryPatched?: boolean
      }
      if (win.__tldwHfHistoryPatched) return
      win.__tldwHfHistoryPatched = true

      let lastHref = window.location.href

      const handleUrlChange = () => {
        const href = window.location.href
        if (href === lastHref) return
        lastHref = href
        injectButton()
      }

      const originalPushState = history.pushState
      history.pushState = function (
        data: unknown,
        unused: string,
        url?: string | URL | null
      ): void {
        originalPushState.call(this, data, unused, url)
        handleUrlChange()
      }

      const originalReplaceState = history.replaceState
      history.replaceState = function (
        data: unknown,
        unused: string,
        url?: string | URL | null
      ): void {
        originalReplaceState.call(this, data, unused, url)
        handleUrlChange()
      }

      window.addEventListener("popstate", handleUrlChange)
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

    setupSpaNavigationListener()
  },
  allFrames: false,
  matches: ["*://huggingface.co/*"]
})
