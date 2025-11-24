import { apiSend } from "@/services/api-send"
import type { AllowedPath } from "@/services/tldw/openapi-guard"

export default defineContentScript({
  main(ctx) {
    let isPulling = false

    const extractOllamaModelName = (cmd: string): string | null => {
      const line = cmd
        .split("\n")
        .find((l) => {
          const trimmed = l.trim()
          return (
            trimmed.startsWith("ollama run") ||
            trimmed.startsWith("ollama pull")
          )
        })
      if (!line) return null
      const [, , ...rest] = line.trim().split(/\s+/)
      if (!rest.length) return null
      // Ignore flags and grab the first non-flag token as the model name
      const modelToken = rest.find((token) => !token.startsWith("-"))
      return modelToken || null
    }

    const downloadModel = async (modelName: string) => {
      if (isPulling) {
        alert(
          `[tldw Assistant] A model pull request is already in progress. Please wait for it to finish before starting another one.`
        )
        return false
      }

      const ok = confirm(
        `[tldw Assistant] Do you want to send a request to your tldw_server to pull the "${modelName}" model? This is independent of the huggingface.co website. Your server will start pulling the model after you confirm.`
      )
      if (ok) {
        isPulling = true
        alert(
          `[tldw Assistant] Sending a request to your tldw_server to pull "${modelName}". Check the extension icon or your tldw_server logs for progress.`
        )

        // Path is declared in OpenAPI; annotate for compile-time safety
        const path = '/api/v1/media/add' as AllowedPath
        try {
          const resp = await apiSend({
            path,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { url: window.location.href, model: modelName }
          })
          if (!resp?.ok) {
            console.error(
              "[tldw Assistant] Model pull request rejected by tldw_server",
              resp
            )
            alert(
              `[tldw Assistant] Failed to send a pull request for "${modelName}": ${
                resp.error || `status ${resp.status ?? "unknown"}`
              }. Check Settings → tldw server and try again.`
            )
            return false
          }
          alert(
            `[tldw Assistant] Request sent to your tldw_server to pull "${modelName}". Monitor the extension icon or tldw_server logs for status.`
          )
          return true
        } catch (error) {
          console.error(
            "[tldw Assistant] Failed to send model pull request to tldw_server",
            error
          )
          alert(
            `[tldw Assistant] Something went wrong while sending a pull request for "${modelName}" to your tldw_server. Check that your tldw_server and the extension are running, then try again.`
          )
          return false
        } finally {
          isPulling = false
        }
      }
      return false
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

    const injectDownloadButton = (modal: HTMLElement) => {
      const copyButton = modal.querySelector(
        'button[title="Copy snippet to clipboard"]'
      )
      
      if (!copyButton && !modal.querySelector(".pageassist-download-button")) {
        const downloadButton = document.createElement("button")
        downloadButton.classList.add("pageassist-download-button", "focus:outline-hidden", "inline-flex", "cursor-pointer", "items-center", "text-sm", "bg-white", "shadow-xs", "rounded-md", "border", "px-2", "py-1", "text-gray-600")
        downloadButton.title = "Send to tldw_server"
        const icon = createDownloadIcon()
        const label = document.createElement("span")
        label.classList.add("ml-1.5")
        label.textContent = "Send to tldw_server"
        downloadButton.append(icon, label)
        
        downloadButton.addEventListener("click", async () => {
          const preElement = modal.querySelector("pre")
          if (!preElement) return

          const modelCommand = preElement.textContent?.trim() || ""
          const modelName = extractOllamaModelName(modelCommand)
          if (!modelName) return

          await downloadModel(modelName)
        })
        
        modal.appendChild(downloadButton)
        return
      }
      
      // Original logic for complex modals
      if (copyButton && !modal.querySelector(".pageassist-download-button")) {
        const downloadButton = copyButton.cloneNode(true) as HTMLElement
        downloadButton.classList.add("pageassist-download-button")
        const existingIcon = downloadButton.querySelector("svg")
        if (existingIcon) {
          existingIcon.replaceWith(createDownloadIcon())
        }
        downloadButton.querySelector("span")!.textContent =
          "Send to tldw_server"
        downloadButton.addEventListener("click", async () => {
          const preElement = modal.querySelector("pre")
          if (!preElement) return

          let modelCommand = ""
          preElement.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              modelCommand += node.textContent
            } else if (node instanceof HTMLSelectElement) {
              modelCommand += node.value
            } else if (node instanceof HTMLElement) {
              const selectElement = node.querySelector(
                "select"
              ) as HTMLSelectElement
              if (selectElement) {
                modelCommand += selectElement.value
              } else {
                modelCommand += node.textContent
              }
            }
          })

          modelCommand = modelCommand.trim()
          const modelName = extractOllamaModelName(modelCommand)
          if (!modelName) return

          await downloadModel(modelName)
        })
        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add("mb-3")
        buttonContainer.style.display = 'flex'
        buttonContainer.style.justifyContent = 'flex-end'
        buttonContainer.appendChild(downloadButton)
        modal.querySelector("pre")!.insertAdjacentElement("afterend", buttonContainer)
      }
    }

    const checkForOllamaCommands = (element: HTMLElement) => {
      const modal = element.querySelector(".shadow-alternate") as HTMLElement
      if (modal) {
        injectDownloadButton(modal)
        return
      }
      const preElements = element.querySelectorAll("pre")
      preElements.forEach((preElement) => {
        const text = preElement.textContent || ""
        if ((text.includes("ollama run") || text.includes("ollama pull")) && 
            !preElement.parentElement?.querySelector(".pageassist-download-button")) {
          const container = preElement.closest("div")
          const copyButton = container?.querySelector('button[title="Copy snippet to clipboard"]')
          
          if (copyButton) {
            const mockModal = document.createElement("div")
            mockModal.appendChild(preElement.cloneNode(true))
            
            injectDownloadButton(mockModal)
            
            const downloadButton = mockModal.querySelector(".pageassist-download-button")
            if (downloadButton) {
              const buttonContainer = document.createElement('div')
              buttonContainer.classList.add("mb-3")
              buttonContainer.style.display = 'flex'
              buttonContainer.style.justifyContent = 'flex-end'
              buttonContainer.appendChild(downloadButton)
              
              preElement.insertAdjacentElement("afterend", buttonContainer)
            }
          }
        }
      })
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            checkForOllamaCommands(node)
          }
        })
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    
    checkForOllamaCommands(document.body)
  },
  allFrames: true,
  matches: ["*://huggingface.co/*"]
})
