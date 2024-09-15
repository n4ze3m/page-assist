export default defineContentScript({
  main(ctx) {
    const downloadModel = async (modelName: string) => {
      const ok = confirm(
        `[Page Assist Extension] Do you want to pull ${modelName} model? This has nothing to do with Ollama.com website. The model will be pulled locally once you confirm.`
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

    const downloadSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 pageasssist-icon">
    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
    `
    const codeDiv = document.querySelectorAll("div.language-none")

    for (let i = 0; i < codeDiv.length; i++) {
      const button = codeDiv[i].querySelector("button")
      const command = codeDiv[i].querySelector("input")
      if (button && command) {
        const newButton = document.createElement("button")
        newButton.innerHTML = downloadSVG
        newButton.className = `border-l ${button.className}`
        newButton.id = `download-${i}-pageassist`
        const modelName = command?.value
          .replace("ollama run", "")
          .replace("ollama pull", "")
          .trim()
        newButton.addEventListener("click", () => {
          downloadModel(modelName)
        })

        const span = document.createElement("span")
        span.title = "Download model via Page Assist"
        span.appendChild(newButton)

        if (button.parentNode) {
          button.parentNode.appendChild(span)
        }

      }
    }
  },
  allFrames: true,
  matches: ["*://ollama.com/*"],

})