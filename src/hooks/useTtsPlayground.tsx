import { useState } from "react"
import {
  getElevenLabsApiKey,
  getElevenLabsModel,
  getElevenLabsVoiceId,
  getRemoveReasoningTagTTS,
  getSpeechPlaybackSpeed,
  getTTSProvider,
  getTldwTTSModel,
  getTldwTTSVoice,
  getTldwTTSResponseFormat,
  getTldwTTSSpeed,
  isSSMLEnabled
} from "@/services/tts"
import { markdownToSSML } from "@/utils/markdown-to-ssml"
import { splitMessageContent } from "@/utils/tts"
import { removeReasoning } from "@/libs/reasoning"
import { markdownToText } from "@/utils/markdown-to-text"
import { generateSpeech } from "@/services/elevenlabs"
import { generateOpenAITTS } from "@/services/openai-tts"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { useAntdNotification } from "./useAntdNotification"
import { useTranslation } from "react-i18next"

export type TtsPlaygroundSegment = {
  id: string
  index: number
  text: string
  url: string
}

export type TtsPlaygroundOverrides = {
  provider?: string
  elevenLabsModel?: string
  elevenLabsVoiceId?: string
  tldwModel?: string
  tldwVoice?: string
  tldwResponseFormat?: string
  tldwSpeed?: number
  openAiModel?: string
  openAiVoice?: string
}

const createObjectUrl = (data: ArrayBuffer): string => {
  const blob = new Blob([data], { type: "audio/mpeg" })
  return URL.createObjectURL(blob)
}

export const useTtsPlayground = () => {
  const [segments, setSegments] = useState<TtsPlaygroundSegment[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const notification = useAntdNotification()
  const { t } = useTranslation("playground")

  const revokeAll = (urls: string[]) => {
    urls.forEach((u) => {
      try {
        URL.revokeObjectURL(u)
      } catch {
        // ignore
      }
    })
  }

  const generateSegments = async (
    text: string,
    overrides?: TtsPlaygroundOverrides
  ) => {
    if (!text.trim()) {
      setSegments([])
      return
    }

    setIsGenerating(true)
    const createdUrls: string[] = []

    try {
      let processed = text
      const shouldRemoveReasoning = await getRemoveReasoningTagTTS()
      const ssmlEnabled = await isSSMLEnabled()

      if (shouldRemoveReasoning) {
        processed = removeReasoning(processed)
      }

      if (ssmlEnabled) {
        processed = markdownToSSML(processed)
      } else {
        processed = markdownToText(processed)
      }

      const provider = overrides?.provider || (await getTTSProvider())
      const playbackSpeed = await getSpeechPlaybackSpeed()
      const sentences = splitMessageContent(processed)

      const outSegments: TtsPlaygroundSegment[] = []

      if (provider === "browser") {
        notification.info({
          message: t(
            "tts.browserInfoTitle",
            "Browser TTS uses system audio"
          ),
          description: t(
            "tts.browserInfoDescription",
            "Browser TTS plays using your system synthesizer and does not expose an audio file. Use ElevenLabs, OpenAI TTS, or tldw to see a track list and player."
          )
        })
        setSegments([])
        return
      }

      if (provider === "elevenlabs") {
        const apiKey = await getElevenLabsApiKey()
        const baseModel = await getElevenLabsModel()
        const baseVoice = await getElevenLabsVoiceId()
        const modelId = overrides?.elevenLabsModel || baseModel
        const voiceId = overrides?.elevenLabsVoiceId || baseVoice

        if (!apiKey || !modelId || !voiceId) {
          throw new Error("Missing ElevenLabs configuration")
        }

        for (let i = 0; i < sentences.length; i++) {
          const buf = await generateSpeech(apiKey, sentences[i], voiceId, modelId)
          const url = createObjectUrl(buf)
          createdUrls.push(url)
          outSegments.push({
            id: `eleven-${i}`,
            index: i,
            text: sentences[i],
            url
          })
        }
      } else if (provider === "openai") {
        for (let i = 0; i < sentences.length; i++) {
          const buf = await generateOpenAITTS({
            text: sentences[i],
            model: overrides?.openAiModel,
            voice: overrides?.openAiVoice
          })
          const url = createObjectUrl(buf)
          createdUrls.push(url)
          outSegments.push({
            id: `openai-${i}`,
            index: i,
            text: sentences[i],
            url
          })
        }
      } else if (provider === "tldw") {
        const baseModel = await getTldwTTSModel()
        const baseVoice = await getTldwTTSVoice()
        const baseFmt = await getTldwTTSResponseFormat()
        const baseSpeed = await getTldwTTSSpeed()

        const model = overrides?.tldwModel || baseModel
        const voice = overrides?.tldwVoice || baseVoice
        const responseFormat = overrides?.tldwResponseFormat || baseFmt
        const speed =
          overrides?.tldwSpeed != null ? overrides.tldwSpeed : baseSpeed

        for (let i = 0; i < sentences.length; i++) {
          const buf = await tldwClient.synthesizeSpeech(sentences[i], {
            model,
            voice,
            responseFormat,
            speed
          })
          const url = createObjectUrl(buf)
          createdUrls.push(url)
          outSegments.push({
            id: `tldw-${i}`,
            index: i,
            text: sentences[i],
            url
          })
        }
      } else {
        notification.warning({
          message: t(
            "tts.unsupportedProviderTitle",
            "Unsupported TTS provider"
          ),
          description: t(
            "tts.unsupportedProviderDescription",
            'The provider "{{provider}}" is not yet supported in the playground player.',
            { provider }
          )
        })
        setSegments([])
        return
      }

      // We do not apply playbackSpeed here because <audio> controls can be used directly.
      setSegments(outSegments)
    } catch (error) {
      revokeAll(createdUrls)
      setSegments([])
      notification.error({
        message: t("tts.generateErrorTitle", "Error generating audio"),
        description:
          error instanceof Error
            ? error.message
            : t(
                "tts.generateErrorDescription",
                "Something went wrong while generating TTS audio."
              )
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const clearSegments = () => {
    revokeAll(segments.map((s) => s.url))
    setSegments([])
  }

  return {
    segments,
    isGenerating,
    generateSegments,
    clearSegments
  }
}
