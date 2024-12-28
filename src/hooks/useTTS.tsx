import { useEffect, useState } from "react"
import { notification } from "antd"
import {
  getElevenLabsApiKey,
  getElevenLabsModel,
  getElevenLabsVoiceId,
  getTTSProvider,
  getVoice,
  isSSMLEnabled
} from "@/services/tts"
import { markdownToSSML } from "@/utils/markdown-to-ssml"
import { generateSpeech } from "@/services/elevenlabs"
import { splitMessageContent } from "@/utils/tts"

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

      if (provider === "browser") {
        const isSSML = await isSSMLEnabled()
        if (isSSML) {
          utterance = markdownToSSML(utterance)
        }
        if (import.meta.env.BROWSER === "chrome") {
          chrome.tts.speak(utterance, {
            voiceName: voice,
            onEvent(event) {
              if (event.type === "start") {
                setIsSpeaking(true)
              } else if (event.type === "end") {
                setIsSpeaking(false)
              }
            }
          })
        } else {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(utterance))
          window.speechSynthesis.onvoiceschanged = () => {
            const voices = window.speechSynthesis.getVoices()
            const voice = voices.find((v) => v.name === voice)
            const utter = new SpeechSynthesisUtterance(utterance)
            utter.voice = voice
            window.speechSynthesis.speak(utter)
          }
        }
      } else if (provider === "elevenlabs") {
        const apiKey = await getElevenLabsApiKey()
        const modelId = await getElevenLabsModel()
        const voiceId = await getElevenLabsVoiceId()
        const sentences = splitMessageContent(utterance)
        let nextAudioData: ArrayBuffer | null = null
        if (!apiKey || !modelId || !voiceId) {
          throw new Error("Missing ElevenLabs configuration")
        }
        for (let i = 0; i < sentences.length; i++) {
          setIsSpeaking(true)

          let currentAudioData =
            nextAudioData ||
            (await generateSpeech(apiKey, sentences[i], voiceId, modelId))
            
          if (i < sentences.length - 1) {
            generateSpeech(apiKey, sentences[i + 1], voiceId, modelId)
              .then((nextAudioData) => {
                nextAudioData = nextAudioData
              })
              .catch(console.error)
          }

          const blob = new Blob([currentAudioData], { type: "audio/mpeg" })
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          setAudioElement(audio)

          await new Promise((resolve) => {
            audio.onended = resolve
            audio.play()
          })

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

    if (import.meta.env.BROWSER === "chrome") {
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
