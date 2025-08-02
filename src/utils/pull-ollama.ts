import { setBadgeBackgroundColor, setBadgeText, setTitle } from "@/utils/action"
import fetcher from "@/libs/fetcher"
import { Storage } from "@plasmohq/storage"

const storage = new Storage({
  area: "local"
})

export const progressHuman = (completed: number, total: number) => {
  return ((completed / total) * 100).toFixed(0) + "%"
}

export const clearBadge = () => {
  setBadgeText({ text: "" })
  setTitle({ title: "" })
}

export const setDownloadState = async (
  modelName: string | null,
  isDownloading: boolean
) => {
  await storage.set("downloadingModel", {
    modelName: decodeURIComponent(modelName || ""),
    isDownloading
  })
}

export const getDownloadState = async () => {
  const state = await storage.get("downloadingModel")
  return state || { modelName: null, isDownloading: false }
}

export const cancelDownload = async () => {
  await storage.set("cancelDownload", true)
}
export const streamDownload = async (url: string, model: string) => {
  url += "/api/pull"

  await setDownloadState(model, true)

  await storage.set("cancelDownload", false)

  const abortController = new AbortController()

  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, stream: true }),
    signal: abortController.signal
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  let isSuccess = true
  let isCancelled = false

  while (true) {
    if (!reader) {
      break
    }

    const cancelFlag = await storage.get("cancelDownload")
    if (cancelFlag) {
      abortController.abort()
      isCancelled = true
      break
    }

    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const text = decoder.decode(value)
    try {
      const json = JSON.parse(text.trim()) as {
        status: string
        total?: number
        completed?: number
      }
      if (json.total && json.completed) {
        setBadgeText({
          text: progressHuman(json.completed, json.total)
        })
        setBadgeBackgroundColor({ color: "#0000FF" })
      } else {
        setBadgeText({ text: "🏋️‍♂️" })
        setBadgeBackgroundColor({ color: "#FFFFFF" })
      }

      setTitle({ title: json.status })

      if (json.status === "success") {
        isSuccess = true
      }
    } catch (e) {
      console.error(e)
    }
  }

  await setDownloadState(null, false)
  await storage.set("cancelDownload", false)

  if (isCancelled) {
    setBadgeText({ text: "⭕" })
    setBadgeBackgroundColor({ color: "#FFA500" })
    setTitle({ title: "Model download cancelled" })
  } else if (isSuccess) {
    setBadgeText({ text: "✅" })
    setBadgeBackgroundColor({ color: "#00FF00" })
    setTitle({ title: "Model pulled successfully" })
  } else {
    setBadgeText({ text: "❌" })
    setBadgeBackgroundColor({ color: "#FF0000" })
    setTitle({ title: "Model pull failed" })
  }

  setTimeout(() => {
    clearBadge()
  }, 5000)
}
