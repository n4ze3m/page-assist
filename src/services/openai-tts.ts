import { tldwClient } from "@/services/tldw"
import {
  getOpenAITTSModel,
  getOpenAITTSVoice
} from "./tts"

export const generateOpenAITTS = async ({
  text,
  model: overrideModel,
  voice: overrideVoice
}: {
  text: string
  model?: string
  voice?: string
  baseURL?: string
  apiKey?: string
}): Promise<ArrayBuffer> => {
  const model = overrideModel || (await getOpenAITTSModel())
  const voice = overrideVoice || (await getOpenAITTSVoice())

  const audio = await tldwClient.synthesizeSpeech(text, {
    model,
    voice
  })

  return audio
}
