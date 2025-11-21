import { bgRequest } from "@/services/background-proxy"

export type TldwTtsVoiceInfo = {
  id?: string
  name?: string
  language?: string
  gender?: string
  description?: string | null
  preview_url?: string | null
  [key: string]: any
}

export type TldwTtsProviderCapabilities = {
  provider_name?: string
  formats?: string[]
  supports_streaming?: boolean
  supports_voice_cloning?: boolean
  supports_ssml?: boolean
  supports_speech_rate?: boolean
  supports_emotion_control?: boolean
  [key: string]: any
}

export type TldwTtsProvidersInfo = {
  providers: Record<string, TldwTtsProviderCapabilities>
  voices: Record<string, TldwTtsVoiceInfo[]>
}

export const fetchTtsProviders = async (): Promise<TldwTtsProvidersInfo | null> => {
  try {
    const res = await bgRequest<any>({
      path: "/api/v1/audio/providers",
      method: "GET"
    })

    if (!res) {
      return null
    }

    const rawProviders = res.providers ?? res
    const rawVoices = res.voices ?? {}

    const providers: Record<string, TldwTtsProviderCapabilities> = {}
    const voices: Record<string, TldwTtsVoiceInfo[]> = {}

    if (rawProviders && typeof rawProviders === "object") {
      for (const key of Object.keys(rawProviders)) {
        const value = rawProviders[key]
        if (value && typeof value === "object") {
          providers[key] = value as TldwTtsProviderCapabilities
        }
      }
    }

    if (rawVoices && typeof rawVoices === "object") {
      for (const key of Object.keys(rawVoices)) {
        const list = Array.isArray(rawVoices[key]) ? rawVoices[key] : []
        voices[key] = list as TldwTtsVoiceInfo[]
      }
    }

    if (Object.keys(providers).length === 0 && Object.keys(voices).length === 0) {
      return null
    }

    return { providers, voices }
  } catch {
    return null
  }
}

