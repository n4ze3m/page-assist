import { useEffect, useRef, useState } from 'react'

function floatTo16BitPCM(float32Array: Float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  let offset = 0
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

export function useMicStream(onChunk: (pcmChunk: ArrayBuffer) => void) {
  const [active, setActive] = useState(false)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  const start = async () => {
    if (active) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStreamRef.current = stream
    const ctx = new AudioContext({ sampleRate: 16000 })
    ctxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    sourceRef.current = source
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor
    source.connect(processor)
    processor.connect(ctx.destination)
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const pcm = floatTo16BitPCM(input)
      onChunk(pcm)
    }
    setActive(true)
  }

  const stop = () => {
    try { processorRef.current?.disconnect() } catch {}
    try { sourceRef.current?.disconnect() } catch {}
    try { ctxRef.current?.close() } catch {}
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    processorRef.current = null
    sourceRef.current = null
    mediaStreamRef.current = null
    ctxRef.current = null
    setActive(false)
  }

  useEffect(() => () => stop(), [])

  return { start, stop, active }
}

