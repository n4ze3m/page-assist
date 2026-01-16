import OpenAI from "openai"
import {
  getOpenAITTSApiKey,
  getOpenAITTSBaseUrl,
  getOpenAITTSModel,
  getOpenAITTSVoice
} from "./tts"

export const generateOpenAITTS = async ({
  text
}: {
  text: string
}): Promise<ArrayBuffer> => {
  const baseURL = await getOpenAITTSBaseUrl()
  const apiKey = await getOpenAITTSApiKey()
  const model = await getOpenAITTSModel()
  const voice = await getOpenAITTSVoice()

  const openai = new OpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
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
