export const TINY_VOCA_VOICES = [
  { label: "F2 (Female)", value: "F2" },
  { label: "M2 (Male)", value: "M2" }
]

export const DEFAULT_TINY_VOCA_VOICE = "F2"

type WorkerMessage =
  | { type: "chunk"; audio: ArrayBuffer }
  | { type: "downloading" }
  | { type: "done" }
  | { type: "error"; message: string }

let worker: Worker | null = null
let lastId = 0

const getWorker = () => {
  if (!worker) {
    // an extension file (see entries/tinyVocaWorker.ts), never the dev server:
    // Chrome kills the page when it starts a worker from another origin
    worker = new Worker("/tinyVocaWorker.js")
  }
  return worker
}

const ask = (type: "status" | "download") =>
  new Promise<boolean>((resolve, reject) => {
    const current = getWorker()
    const id = ++lastId
    const stop = () => {
      current.removeEventListener("message", onMessage)
      current.removeEventListener("error", onError)
    }
    const onMessage = ({ data }: MessageEvent) => {
      if (data.id !== id || data.type === "downloading") return
      stop()
      if (data.type === "error") reject(new Error(data.message))
      else resolve(data.saved)
    }
    const onError = (event: ErrorEvent) => {
      stop()
      reject(new Error(event.message || "Tiny Voca worker failed"))
    }
    current.addEventListener("message", onMessage)
    current.addEventListener("error", onError)
    current.postMessage({ id, type })
  })

/** Whether the model is already saved on this device. */
export const isTinyVocaModelDownloaded = () => ask("status")

/** Downloads the model (8 MB) from Hugging Face and saves it on this device. */
export const downloadTinyVocaModel = () => ask("download")

/**
 * Speaks the text with the Tiny Voca model, fully on device. The model
 * (8 MB) is downloaded from Hugging Face on first use and kept after that.
 * Yields one WAV buffer per sentence as soon as it is ready. Stop iterating
 * to cancel the sentences that are not made yet.
 */
export async function* generateTinyVocaTTS({
  text,
  voice,
  onDownload
}: {
  text: string
  voice?: string
  onDownload?: () => void
}): AsyncGenerator<ArrayBuffer> {
  const current = getWorker()
  const id = ++lastId
  const queue: WorkerMessage[] = []
  let wake: (() => void) | null = null
  let finished = false

  const push = (message: WorkerMessage) => {
    queue.push(message)
    wake?.()
  }
  const onMessage = ({ data }: MessageEvent) => {
    if (data.id === id) push(data)
  }
  const onError = (event: ErrorEvent) => {
    current.terminate()
    if (worker === current) worker = null
    push({ type: "error", message: event.message || "Tiny Voca worker failed" })
  }

  current.addEventListener("message", onMessage)
  current.addEventListener("error", onError)

  try {
    current.postMessage({
      id,
      text,
      voice: TINY_VOCA_VOICES.some((v) => v.value === voice)
        ? voice
        : DEFAULT_TINY_VOCA_VOICE
    })
    while (true) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => (wake = resolve))
      }
      const message = queue.shift()!
      if (message.type === "chunk") {
        yield message.audio
        continue
      }
      if (message.type === "downloading") {
        onDownload?.()
        continue
      }
      finished = true
      if (message.type === "error") {
        throw new Error(message.message)
      }
      return
    }
  } finally {
    current.removeEventListener("message", onMessage)
    current.removeEventListener("error", onError)
    if (!finished) {
      current.postMessage({ type: "cancel", id })
    }
  }
}
