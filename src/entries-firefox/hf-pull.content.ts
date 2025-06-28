export default defineContentScript({
  main(ctx) {
    const downloadModel = async (modelName: string) => {
      const ok = confirm(
        `[Page Assist Extension] Do you want to pull the ${modelName} model? This has nothing to do with the huggingface.co website. The model will be pulled locally once you confirm. Make sure Ollama is running.`
      )
      if (ok) {
        alert(
          `[Page Assist Extension] Pulling ${modelName} model. For more details, check the extension icon.`
        )

        await browser.runtime.sendMessage({
          type: "pull_model",
          modelName
        })
        return true
      }
      return false
    }

    const downloadSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
          <path d="M4 20h16v-2H4v2z"/>
        </svg>
      `

    const injectDownloadButton = (modal: HTMLElement) => {
      const copyButton = modal.querySelector(
        'button[title="Copy snippet to clipboard"]'
      )
      
      if (!copyButton && !modal.querySelector(".pageassist-download-button")) {
        const downloadButton = document.createElement("button")
        downloadButton.classList.add("pageassist-download-button", "focus:outline-hidden", "inline-flex", "cursor-pointer", "items-center", "text-sm", "bg-white", "shadow-xs", "rounded-md", "border", "px-2", "py-1", "text-gray-600")
        downloadButton.title = "Pull from Page Assist"
        downloadButton.innerHTML = `${downloadSVG} <span class="ml-1.5">Pull from Page Assist</span>`
        
        downloadButton.addEventListener("click", async () => {
          const preElement = modal.querySelector("pre")
          if (preElement) {
            const modelCommand = preElement.textContent?.trim() || ""
            
            if (modelCommand.includes("ollama run") || modelCommand.includes("ollama pull")) {
              const lines = modelCommand.split('\n')
              const ollamaLine = lines.find(line => 
                line.trim().startsWith("ollama run") || line.trim().startsWith("ollama pull")
              )
              
              if (ollamaLine) {
                await downloadModel(
                  ollamaLine
                    .trim()
                    .replaceAll("ollama run", "")
                    .replaceAll("ollama pull", "")
                    .trim()
                )
              }
            }
          }
        })
        
        modal.appendChild(downloadButton)
        return
      }
      
      // Original logic for complex modals
      if (copyButton && !modal.querySelector(".pageassist-download-button")) {
        const downloadButton = copyButton.cloneNode(true) as HTMLElement
        downloadButton.classList.add("pageassist-download-button")
        downloadButton.querySelector("svg")!.outerHTML = downloadSVG
        downloadButton.querySelector("span")!.textContent =
          "Pull from Page Assist"
        downloadButton.addEventListener("click", async () => {
          const preElement = modal.querySelector("pre")
          if (preElement) {
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

            if (modelCommand.includes("ollama run") || modelCommand.includes("ollama pull")) {
              const lines = modelCommand.split('\n')
              const ollamaLine = lines.find(line => 
                line.trim().startsWith("ollama run") || line.trim().startsWith("ollama pull")
              )
              
              if (ollamaLine) {
                await downloadModel(
                  ollamaLine
                    .trim()
                    .replaceAll("ollama run", "")
                    .replaceAll("ollama pull", "")
                    .trim()
                )
              }
            }
          }
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
