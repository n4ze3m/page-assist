export {}
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

const sidePanelController = async () => {
  const sidepanelCommand = await storage.get("sidepanel-command")
  const command = sidepanelCommand || "Ctrl+0"

  document.addEventListener("keydown", (event) => {
    let pressedKey = ""
    if (event.ctrlKey) {
      pressedKey += "Ctrl+"
    }

    if (event.shiftKey) {
      pressedKey += "Shift+"
    }

    pressedKey += event.key

    if (pressedKey === command) {
      chrome.runtime.sendMessage({ type: "sidepanel" })
    }
  })
}

sidePanelController()
