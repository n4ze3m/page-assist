import { Storage } from "./index"

export const table = async ({
  storage = new Storage(),
  printer = console.table
}) => {
  const itemMap = await storage.getAll()
  printer(itemMap)
}

export const startChangeReporter = ({
  storage = new Storage(),
  printer = console.table
}) => {
  // Skip for web app since chrome.storage is not available
  if (import.meta.env.IS_WEB_APP === "true") {
    console.warn("Storage change reporter not available in web app mode")
    return
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    console.log("Storage Changed:", changes)
    if (area === storage.area) {
      table({ storage, printer })
    }
  })
}
