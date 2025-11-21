import OpenAI from "openai"
import {
  getOpenAITTSApiKey,
  getOpenAITTSBaseUrl,
  getOpenAITTSModel,
  getOpenAITTSVoice
} from "./tts"

export const generateOpenAITTS = async ({
  text,
  model: overrideModel,
  voice: overrideVoice,
  baseURL: overrideBaseUrl,
  apiKey: overrideApiKey
}: {
  text: string
  model?: string
  voice?: string
  baseURL?: string
  apiKey?: string
}): Promise<ArrayBuffer> => {
  const baseURL = overrideBaseUrl || (await getOpenAITTSBaseUrl())
  const apiKey = overrideApiKey || (await getOpenAITTSApiKey())
  const model = overrideModel || (await getOpenAITTSModel())
  const voice = overrideVoice || (await getOpenAITTSVoice())

  const openai = new OpenAI({
    baseURL,
    apiKey,
    dangerouslyAllowBrowser: true
  })

  const mp3 = await openai.audio.speech.create({
    model: model,
    voice: voice,
    input: text
  })

  const arrBuff = await mp3.arrayBuffer()

  return arrBuff
}
