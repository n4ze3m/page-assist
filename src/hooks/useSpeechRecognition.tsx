import { useRef, useEffect, useState, useCallback } from "react"

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList
  resultIndex: number
}

declare global {
  interface SpeechRecognitionErrorEvent extends Event {
    error: string
  }
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type SpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  grammars: any
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: Event) => void
  onend: () => void
  start: () => void
  stop: () => void
}

type SpeechRecognitionProps = {
  onEnd?: () => void
  onResult?: (transcript: string) => void
  onError?: (event: Event) => void
  autoStop?: boolean
  autoStopTimeout?: number
  autoSubmit?: boolean
}

type ListenArgs = {
  lang?: string
  interimResults?: boolean
  continuous?: boolean
  maxAlternatives?: number
  grammars?: any
  autoStop?: boolean
  autoStopTimeout?: number
  autoSubmit?: boolean
}

type SpeechRecognitionHook = {
  start: (args?: ListenArgs) => void
  isListening: boolean
  stop: () => void
  supported: boolean
  transcript: string
  resetTranscript: () => void
}

const useEventCallback = <T extends (...args: any[]) => any>(
  fn: T,
  dependencies: any[]
) => {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = fn
  }, [fn, ...dependencies])

  return useCallback(
    (...args: Parameters<T>) => {
      const fn = ref.current
      return fn!(...args)
    },
    [ref]
  )
}

export const useSpeechRecognition = (
  props: SpeechRecognitionProps = {}
): SpeechRecognitionHook => {
  const {
    onEnd = () => {},
    onResult = () => {},
    onError = () => {},
    autoStop = false,
    autoStopTimeout = 5000,
    autoSubmit = false
  } = props

  const recognition = useRef<SpeechRecognition | null>(null)
  const [listening, setListening] = useState<boolean>(false)
  const [supported, setSupported] = useState<boolean>(false)
  const [liveTranscript, setLiveTranscript] = useState<string>("")
  const silenceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef<string>("")

  useEffect(() => {
    if (typeof window === "undefined") return
    window.SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (window.SpeechRecognition) {
      setSupported(true)
      recognition.current = new window.SpeechRecognition()
    }
  }, [])

  const resetTranscript = () => {
    setLiveTranscript("")
    lastTranscriptRef.current = ""
  }

  const processResult = (
    event: SpeechRecognitionEvent,
    shouldAutoStop: boolean,
    shouldAutoSubmit: boolean
  ) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0])
      .map((result) => result.transcript)
      .join("")

    onResult(transcript)

    // Reset silence timer if transcript changed
    if (shouldAutoStop && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript

      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current)
      }

      silenceTimer.current = setTimeout(() => {
        stop()
        if (shouldAutoSubmit) {
          // Submit the final transcript
          onResult(transcript)
        }
      }, autoStopTimeout)
    }
  }

  const handleError = (event: Event) => {
    if ((event as SpeechRecognitionErrorEvent).error === "not-allowed") {
      if (recognition.current) {
        recognition.current.onend = null
      }
      setListening(false)
    }
    onError(event)
  }

  const listen = useEventCallback(
    (args: ListenArgs = {}) => {
      if (listening || !supported) return
      const {
        lang = "",
        interimResults = true,
        continuous = false,
        maxAlternatives = 1,
        grammars,
        autoStop: argAutoStop = autoStop,
        autoStopTimeout: argAutoStopTimeout = autoStopTimeout,
        autoSubmit: argAutoSubmit = autoSubmit
      } = args

      setListening(true)
      setLiveTranscript("")
      lastTranscriptRef.current = ""

      if (recognition.current) {
        recognition.current.lang = lang
        recognition.current.interimResults = interimResults
        recognition.current.onresult = (event) => {
          processResult(event, argAutoStop, argAutoSubmit)
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join("")
          setLiveTranscript(transcript)
        }
        recognition.current.onerror = handleError
        recognition.current.continuous = continuous
        recognition.current.maxAlternatives = maxAlternatives

        if (grammars) {
          recognition.current.grammars = grammars
        }
        recognition.current.onend = () => {
          if (recognition.current && !argAutoStop) {
            recognition.current.start()
          } else {
            onEnd()
          }
        }
        if (recognition.current) {
          recognition.current.start()
        }
      }
    },
    [listening, supported, recognition, autoStop, autoStopTimeout, autoSubmit]
  )

  const stop = useEventCallback(() => {
    if (!listening || !supported) return

    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current)
      silenceTimer.current = null
    }

    if (recognition.current) {
      recognition.current.onresult = null
      recognition.current.onend = null
      recognition.current.onerror = null
      setListening(false)
      recognition.current.stop()
    }
    onEnd()
  }, [listening, supported, recognition, onEnd])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current)
      }
    }
  }, [])

  return {
    start: listen,
    isListening: listening,
    stop,
    supported,
    transcript: liveTranscript,
    resetTranscript
  }
}
