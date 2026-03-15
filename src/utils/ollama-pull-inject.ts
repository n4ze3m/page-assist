const downloadSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 pageasssist-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>`

function makeDownloadButton(
  id: string,
  modelName: string,
  className: string,
  sendMessage: (modelName: string) => Promise<void>
): HTMLButtonElement {
  const btn = document.createElement("button")
  btn.id = id
  btn.innerHTML = downloadSVG
  btn.title = "Download model via Page Assist"
  btn.className = className
  btn.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = confirm(
      `[Page Assist Extension] Do you want to pull ${modelName} model? This has nothing to do with Ollama.com website. The model will be pulled locally once you confirm.`
    )
    if (ok) {
      alert(
        `[Page Assist Extension] Pulling ${modelName} model. For more details, check the extension icon.`
      )
      await sendMessage(modelName)
    }
  })
  return btn
}

export function injectOllamaPullButtons(
  sendMessage: (modelName: string) => Promise<void>
) {
  const usageSection = document.querySelector("section[data-usage-section]")
  if (usageSection && !document.getElementById("pa-download-cli")) {
    const cliPanel = usageSection.querySelector<HTMLElement>(
      '.use-panel[data-panel="cli"]'
    )
    const copyBtn = usageSection.querySelector<HTMLButtonElement>(
      "button.use-copy-btn"
    )
    if (cliPanel && copyBtn) {
      const modelName = cliPanel
        .querySelector("pre")
        ?.textContent?.replace("ollama run", "")
        .replace("ollama pull", "")
        .trim()
      if (modelName) {
        const btn = makeDownloadButton(
          "pa-download-cli",
          modelName,
          copyBtn.className,
          sendMessage
        )
        copyBtn.insertAdjacentElement("afterend", btn)
      }
    }
  }

  const appSection = document.getElementById("external-tools-section")
  const commandInputs =
    document.querySelectorAll<HTMLInputElement>("input.command")

  for (let i = 0; i < commandInputs.length; i++) {
    const input = commandInputs[i]

    if (appSection?.contains(input)) continue

    const modelName = input.value.trim()
    if (!modelName) continue

    const buttonId = `pa-download-model-${i}`
    if (document.getElementById(buttonId)) continue

    const copyButton = input.nextElementSibling as HTMLButtonElement | null
    if (!copyButton || copyButton.tagName !== "BUTTON") continue

    const btn = makeDownloadButton(
      buttonId,
      modelName,
      copyButton.className,
      sendMessage
    )
    copyButton.insertAdjacentElement("afterend", btn)
  }
}
