import { useEffect, useState } from "react"
import { notification } from "antd"
import {
  getElevenLabsApiKey,
  getElevenLabsModel,
  getElevenLabsVoiceId,
  getRemoveReasoningTagTTS,
  getTTSProvider,
  getVoice,
  isSSMLEnabled,
  getSpeechPlaybackSpeed
} from "@/services/tts"
import { markdownToSSML } from "@/utils/markdown-to-ssml"
import { generateSpeech } from "@/services/elevenlabs"
import { splitMessageContent } from "@/utils/tts"
import { removeReasoning } from "@/libs/reasoning"
import { markdownToText } from "@/utils/markdown-to-text"
import { generateOpenAITTS } from "@/services/openai-tts"

export interface VoiceOptions {
  utterance: string
}

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  )

  const speak = async ({ utterance }: VoiceOptions) => {
    try {
      const voice = await getVoice()
      const provider = await getTTSProvider()
      const isRemoveReasoning = await getRemoveReasoningTagTTS()
      const playbackSpeed = await getSpeechPlaybackSpeed()

      if (isRemoveReasoning) {
        utterance = removeReasoning(utterance)
      }
      const isSSML = await isSSMLEnabled()
      if (isSSML) {
        utterance = markdownToSSML(utterance)
      } else {
        utterance = markdownToText(utterance)
      }
      if (provider === "browser") {
        if (
          import.meta.env.BROWSER === "chrome" ||
          import.meta.env.BROWSER === "edge"
        ) {
          chrome.tts.speak(utterance, {
            voiceName: voice,
            rate: playbackSpeed,
            onEvent(event) {
              if (event.type === "start") {
                setIsSpeaking(true)
              } else if (event.type === "end") {
                setIsSpeaking(false)
              }
            }
          })
        } else {
          const synthesisUtterance = new SpeechSynthesisUtterance(utterance)
          synthesisUtterance.rate = playbackSpeed
          synthesisUtterance.onstart = () => {
            setIsSpeaking(true)
          }
          synthesisUtterance.onend = () => {
            setIsSpeaking(false)
          }
          const voices = window.speechSynthesis.getVoices()
          const selectedVoice = voices.find((v) => v.name === voice)
          if (selectedVoice) {
            synthesisUtterance.voice = selectedVoice
          } else {
            window.speechSynthesis.onvoiceschanged = () => {
              const updatedVoices = window.speechSynthesis.getVoices()
              const newVoice = updatedVoices.find((v) => v.name === voice)
              if (newVoice) {
                synthesisUtterance.voice = newVoice
              }
            }
          }
          window.speechSynthesis.speak(synthesisUtterance)
        }
      } else if (provider === "elevenlabs") {
        const apiKey = await getElevenLabsApiKey()
        const modelId = await getElevenLabsModel()
        const voiceId = await getElevenLabsVoiceId()
        const sentences = splitMessageContent(utterance)
        
        if (!apiKey || !modelId || !voiceId) {
          throw new Error("Missing ElevenLabs configuration")
        }

        // Pre-fetch first audio
        let nextAudioData: ArrayBuffer | null = null
        let nextAudioPromise: Promise<ArrayBuffer> | null = null

        for (let i = 0; i < sentences.length; i++) {
          setIsSpeaking(true)

          // Get current audio data (either from cache or generate)
          let currentAudioData: ArrayBuffer
          if (nextAudioData) {
            currentAudioData = nextAudioData
            nextAudioData = null
          } else {
            currentAudioData = await generateSpeech(apiKey, sentences[i], voiceId, modelId)
          }

          // Start fetching next audio in parallel (if there's a next sentence)
          if (i < sentences.length - 1) {
            nextAudioPromise = generateSpeech(apiKey, sentences[i + 1], voiceId, modelId)
          }

          // Play current audio
          const blob = new Blob([currentAudioData], { type: "audio/mpeg" })
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audio.playbackRate = playbackSpeed
          setAudioElement(audio)

          // Wait for current audio to finish and next audio to be ready
          await Promise.all([
            new Promise((resolve) => {
              audio.onended = resolve
              audio.play()
            }),
            nextAudioPromise?.then((data) => {
              nextAudioData = data
            }).catch(console.error) || Promise.resolve()
          ])

          URL.revokeObjectURL(url)
        }

        setIsSpeaking(false)
        setAudioElement(null)
      } else if (provider === "openai") {
        const sentences = splitMessageContent(utterance)
        
        // Pre-fetch first audio
        let nextAudioData: ArrayBuffer | null = null
        let nextAudioPromise: Promise<ArrayBuffer> | null = null

        for (let i = 0; i < sentences.length; i++) {
          setIsSpeaking(true)

          // Get current audio data (either from cache or generate)
          let currentAudioData: ArrayBuffer
          if (nextAudioData) {
            currentAudioData = nextAudioData
            nextAudioData = null
          } else {
            currentAudioData = await generateOpenAITTS({
              text: sentences[i]
            })
          }

          // Start fetching next audio in parallel (if there's a next sentence)
          if (i < sentences.length - 1) {
            nextAudioPromise = generateOpenAITTS({
              text: sentences[i + 1]
            })
          }

          // Play current audio
          const blob = new Blob([currentAudioData], { type: "audio/mpeg" })
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audio.playbackRate = playbackSpeed
          setAudioElement(audio)

          // Wait for current audio to finish and next audio to be ready
          await Promise.all([
            new Promise((resolve) => {
              audio.onended = resolve
              audio.play()
            }),
            nextAudioPromise?.then((data) => {
              nextAudioData = data
            }).catch(console.error) || Promise.resolve()
          ])

          URL.revokeObjectURL(url)
        }

        setIsSpeaking(false)
        setAudioElement(null)
      }
    } catch (error) {
      setIsSpeaking(false)
      setAudioElement(null)
      notification.error({
        message: "Error",
        description: "Something went wrong while trying to play the audio"
      })
    }
  }

  const cancel = () => {
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
      setAudioElement(null)
      setIsSpeaking(false)
      return
    }

    if (
      import.meta.env.BROWSER === "chrome" ||
      import.meta.env.BROWSER === "edge"
    ) {
      chrome.tts.stop()
    } else {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }

  useEffect(() => {
    return () => {
      cancel()
    }
  }, [])

  return {
    speak,
    cancel,
    isSpeaking
  }
}
