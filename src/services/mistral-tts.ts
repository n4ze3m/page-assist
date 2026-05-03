import {
  getMistralTTSApiKey,
  getMistralTTSBaseUrl,
  getMistralTTSModel,
  getMistralTTSVoiceId
} from "./tts"

export interface MistralVoice {
  voice_id: string
  name: string
  languages?: string[]
}

export const getMistralVoices = async (
  apiKey: string,
  baseURL: string
): Promise<MistralVoice[]> => {
  const fetchPage = async (page: number) => {
    const response = await fetch(
      `${baseURL}/audio/voices?page=${page}&page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(
        `Mistral list voices failed: ${response.status} ${errText}`
      )
    }

    return response.json()
  }

  const collected: any[] = []
  let page = 1
  while (true) {
    const data = await fetchPage(page)
    const items: any[] = data?.items ?? []
    collected.push(...items)
    const totalPages = data?.total_pages ?? 1
    if (page >= totalPages || items.length === 0) break
    page += 1
  }

  return collected.map((v: any) => ({
    voice_id: v.id ?? v.voice_id,
    name: v.name ?? v.slug ?? v.id,
    languages: v.languages
  }))
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const generateMistralTTS = async ({
  text
}: {
  text: string
}): Promise<ArrayBuffer> => {
  const baseURL = await getMistralTTSBaseUrl()
  const apiKey = await getMistralTTSApiKey()
  const model = await getMistralTTSModel()
  const voiceId = await getMistralTTSVoiceId()

  if (!apiKey || !voiceId) {
    throw new Error("Missing Mistral TTS configuration")
  }

  const response = await fetch(`${baseURL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: text,
      voice_id: voiceId,
      response_format: "mp3"
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Mistral TTS request failed: ${response.status} ${errText}`)
  }

  const data = await response.json()
  return base64ToArrayBuffer(data.audio_data)
}
