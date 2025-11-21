import { bgRequest } from "@/services/background-proxy"

export type TldwVoice = {
  id?: string
  voice_id?: string
  name?: string
  description?: string | null
  provider?: string | null
  duration_seconds?: number | null
  tags?: string[] | null
}

export const fetchTldwVoices = async (): Promise<TldwVoice[]> => {
  try {
    const res = await bgRequest<any>({
      path: "/api/v1/audio/voices",
      method: "GET"
    })
    if (!res) return []
    if (Array.isArray(res)) return res
    if (Array.isArray(res.voices)) return res.voices
    return []
  } catch {
    return []
  }
}

export const fetchTldwVoiceCatalog = async (
  provider: string
): Promise<TldwVoice[]> => {
  const p = String(provider || "").trim()
  if (!p) return []
  try {
    const res = await bgRequest<any>({
      path: `/api/v1/audio/voices/catalog?provider=${encodeURIComponent(p)}`,
      method: "GET"
    })
    if (!res) return []
    if (Array.isArray(res)) return res as TldwVoice[]
    if (Array.isArray(res.voices)) return res.voices as TldwVoice[]
    if (Array.isArray(res.data)) return res.data as TldwVoice[]
    return []
  } catch {
    return []
  }
}
