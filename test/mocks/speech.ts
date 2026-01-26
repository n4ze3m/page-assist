export function installSpeechMocks(globalObj: any) {
  // speechSynthesis
  const synthListeners: { onvoiceschanged: (() => void) | null } = {
    onvoiceschanged: null
  }
  const voices = [
    { name: 'TestVoice', lang: 'en-US', default: true } as any
  ]
  globalObj.window = globalObj.window || globalObj
  globalObj.window.speechSynthesis = {
    getVoices: () => voices as any,
    speak: (_u: any) => {},
    cancel: () => {},
    paused: false,
    pending: false,
    speaking: false,
    onvoiceschanged: null,
  } as any

  // Assign handler proxy
  Object.defineProperty(globalObj.window.speechSynthesis, 'onvoiceschanged', {
    get() { return synthListeners.onvoiceschanged },
    set(v) { synthListeners.onvoiceschanged = typeof v === 'function' ? v : null }
  })

  // SpeechRecognition
  class MockSpeechRecognition {
    lang = 'en-US'
    continuous = false
    interimResults = false
    maxAlternatives = 1
    grammars: any
    onaudioend: any
    onaudiostart: any
    onend: any
    onerror: any
    onnomatch: any
    onresult: any
    onsoundend: any
    onsoundstart: any
    onspeechend: any
    onspeechstart: any
    onstart: any
    start() { /* no-op */ }
    stop() { /* no-op */ }
    abort() { /* no-op */ }
  }
  globalObj.window.SpeechRecognition = MockSpeechRecognition as any
  globalObj.window.webkitSpeechRecognition = MockSpeechRecognition as any
}
