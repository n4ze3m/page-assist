import { useEffect, useState } from "react"
import { notification } from "antd"
import { getVoice, isSSMLEnabled } from "@/services/tts"
import { markdownToSSML } from "@/utils/markdown-to-ssml"

type VoiceOptions = {
  utterance: string
}

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speak = async ({ utterance }: VoiceOptions) => {
    try {
      const voice = await getVoice()
      const isSSML = await isSSMLEnabled()
      if (isSSML) {
        utterance = markdownToSSML(utterance)
      }
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
    } catch (error) {
      notification.error({
        message: "Error",
        description: "Something went wrong while trying to play the audio"
      })
    }
  }

  const cancel = () => {
    chrome.tts.stop()
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
