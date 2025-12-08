import { tldwClient } from "@/services/tldw"
import { getOpenAITTSModel, getOpenAITTSVoice } from "./tts"

export const generateOpenAITTS: (params: {
  text: string
  model?: string
  voice?: string
}) => Promise<ArrayBuffer> = async ({
  text,
  model: overrideModel,
  voice: overrideVoice
}) => {
  const model = overrideModel || (await getOpenAITTSModel())
  const voice = overrideVoice || (await getOpenAITTSVoice())

  const audio = await tldwClient.synthesizeSpeech(text, {
    model,
    voice
  })

  return audio
}
