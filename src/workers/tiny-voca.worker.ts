import { readGGUF, TinyVoca } from "@/libs/tiny-voca/tiny-voca.js"
import { fromGGUF } from "@/libs/tiny-voca/dizione/engine.js"
import { utterancesOf, limited, wav } from "@/libs/tiny-voca/text.js"

// pinned to a revision, so the file behind this address never changes
const MODEL_URL =
  "https://huggingface.co/n4ze3m/tiny-voca/resolve/5fe06641d0afecb3c04bc9faca2cf64d9b2b1600/gguf/tiny-voca-js.gguf"
const DB_NAME = "tiny-voca"
const STORE = "model"

type Engine = { voca: any; phonemizer: any }

let engine: Promise<Engine> | null = null
const cancelled = new Set<number>()

const openStore = (mode: IDBTransactionMode) =>
  new Promise<IDBObjectStore>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () =>
      resolve(request.result.transaction(STORE, mode).objectStore(STORE))
    request.onerror = () => reject(request.error)
  })

const readSaved = async (): Promise<ArrayBuffer | null> => {
  try {
    const store = await openStore("readonly")
    return await new Promise((resolve, reject) => {
      const request = store.get(MODEL_URL)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    return null
  }
}

const isSaved = async (): Promise<boolean> => {
  try {
    const store = await openStore("readonly")
    return await new Promise((resolve, reject) => {
      const request = store.count(MODEL_URL)
      request.onsuccess = () => resolve(request.result > 0)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    return false
  }
}

const save = async (buffer: ArrayBuffer) => {
  try {
    const store = await openStore("readwrite")
    // older revisions are of no use once a new one is pinned
    store.clear()
    store.put(buffer, MODEL_URL)
  } catch (error) {
    console.warn("Unable to save the Tiny Voca model", error)
  }
}

const loadModel = async (id: number): Promise<Engine> => {
  let buffer = await readSaved()
  if (!buffer) {
    self.postMessage({ id, type: "downloading" })
    const response = await fetch(MODEL_URL)
    if (!response.ok) {
      throw new Error(`Unable to download the Tiny Voca model: ${response.status}`)
    }
    buffer = await response.arrayBuffer()
    await save(buffer)
  }
  const file = readGGUF(buffer)
  return { voca: new TinyVoca(file), phonemizer: await fromGGUF(file) }
}

const getEngine = (id: number) => {
  if (!engine) {
    engine = loadModel(id).catch((error) => {
      engine = null
      throw error
    })
  }
  return engine
}

export const startTinyVocaWorker = () => {
  self.onmessage = async ({ data }: MessageEvent) => {
    if (data.type === "cancel") {
      cancelled.add(data.id)
      return
    }

    if (data.type === "status" || data.type === "download") {
      try {
        if (data.type === "download") await getEngine(data.id)
        self.postMessage({ id: data.id, type: "done", saved: await isSaved() })
      } catch (error) {
        self.postMessage({
          id: data.id,
          type: "error",
          message: error?.message || String(error)
        })
      }
      return
    }

    const { id, text, voice } = data
    try {
      const { voca, phonemizer } = await getEngine(id)
      const utterances = utterancesOf(
        text,
        phonemizer,
        voca.config.max_tokens - 12
      )
      for (const [seed, { ids, stress }] of utterances.entries()) {
        // synthesis blocks this thread, so give a cancel message a chance to land
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (cancelled.has(id)) break
        const { audio } = voca.synthesize(ids, stress, { voice, seed })
        const buffer = wav(limited(audio), voca.config.sample_rate)
        ;(self as any).postMessage({ id, type: "chunk", audio: buffer }, [buffer])
      }
      self.postMessage({ id, type: "done" })
    } catch (error) {
      self.postMessage({
        id,
        type: "error",
        message: error?.message || String(error)
      })
    } finally {
      cancelled.delete(id)
    }
  }
}
