import { browser } from "wxt/browser"

// Kokoro TTS: lazy-load model and play audio on demand via messages from background.
let kokoroPromise: Promise<any> | null = null
let currentAudio: HTMLAudioElement | null = null

async function loadKokoro() {
  if (!kokoroPromise) {
    kokoroPromise = (async () => {
      const { KokoroTTS } = await import("kokoro-js")
      try {
        const device = ((navigator as any).gpu ? "webgpu" : "wasm") as "webgpu" | "wasm"
        const dtype = device === "webgpu" ? ("fp32" as const) : ("q8" as const)
        return await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype, device })
      } catch (e) {
        // Fallback to WASM/q8 if WebGPU path fails
        const { KokoroTTS } = await import("kokoro-js")
        return await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm" })
      }
    })()
  }
  return kokoroPromise
}

async function speakWithKokoro(text: string) {
  const tts = await loadKokoro()
  const raw = await tts.generate(text, { voice: "af_heart" })
  const blob = raw.toBlob()
  const url = URL.createObjectURL(blob)

  if (currentAudio) {
    try { currentAudio.pause() } catch {}
    if (currentAudio.src) URL.revokeObjectURL(currentAudio.src)
  }

  currentAudio = new Audio(url)
  currentAudio.addEventListener("ended", () => {
    URL.revokeObjectURL(url)
  })
  await currentAudio.play()
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message?.type === "kokoro_tts_speak") {
    const text = (message.text || window.getSelection()?.toString() || "").trim()
    if (text) {
      try {
        await speakWithKokoro(text)
      } catch (err) {
        console.error("[Page Assist] Kokoro TTS error:", err)
      }
    }
  } else if (message?.type === "kokoro_tts_stop") {
    if (currentAudio) {
      try { currentAudio.pause() } catch {}
    }
  }
})
