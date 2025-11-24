
import { Storage } from "@plasmohq/storage"
import { getCustomHeaders } from "@/utils/clean-headers"

type Model = {
  id: string
  name?: string
  display_name?: string
  type: string
}

export const getAllOpenAIModels = async ({
  baseUrl,
  apiKey,
  customHeaders = []
}: {
  baseUrl: string
  apiKey?: string
  customHeaders?: { key: string; value: string }[]
}) => {
  // Only probe model listings for OpenAI-compatible bases. Skip obvious non-OpenAI
  // URLs (e.g., tldw_server /api paths or deeply nested endpoints) to avoid noisy
  // 404s like /v1/chat/completions/models.
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  let serverOrigin: string | null = null
  try {
    const cfg = await new Storage({ area: "local" }).get<any>("tldwConfig")
    if (cfg?.serverUrl) {
      serverOrigin = new URL(String(cfg.serverUrl)).origin
    }
  } catch {
    // ignore storage parsing failures
  }
  try {
    const urlObj = new URL(normalizedBase)
    const { pathname, hostname, port } = urlObj
    if (serverOrigin && urlObj.origin === serverOrigin) {
      // Use the dedicated tldw model endpoint instead of OpenAI-compatible /models
      return []
    }
    const segments = pathname.split("/").filter(Boolean)
    const allowedSingle = ["v1", "v1beta", "openai"]
    const allowedPatterns = [
      ["v1"],
      ["v1beta"],
      ["openai"],
      ["v1beta", "openai"] // Google OpenAI-compatible base
    ]
    const isShallow =
      segments.length === 0 ||
      (segments.length === 1 && allowedSingle.includes(segments[0])) ||
      allowedPatterns.some(
        (pattern) =>
          pattern.length === segments.length &&
          pattern.every((seg, idx) => seg === segments[idx])
      )
    const looksLikeTldw =
      pathname.includes("/api/") ||
      ((hostname === "127.0.0.1" || hostname === "localhost") &&
        port === "8000")

    if (!isShallow || looksLikeTldw) {
      return []
    }
  } catch {
    // If URL parsing fails, avoid probing
    return []
  }

  try {
    const url = `${normalizedBase}/models`
    const headers = apiKey
      ? {
        Authorization: `Bearer ${apiKey}`,
        ...getCustomHeaders({ headers: customHeaders })
      }
      : {
        ...getCustomHeaders({ headers: customHeaders })
      }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // if Google API fails to return models, try another approach
    if (res.url == 'https://generativelanguage.googleapis.com/v1beta/openai/models') {
      const urlGoogle = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      const resGoogle = await fetch(urlGoogle, {
        signal: controller.signal
      })

      const data = await resGoogle.json()
      return data.models.map(model => ({
        id: model.name.replace(/^models\//, ""),
        name: model.name.replace(/^models\//, ""),
      })) as Model[]
    }

    if (!res.ok) {
      return []
    }

    if (normalizedBase === "https://api.together.xyz/v1") {
      const data = (await res.json()) as Model[]
      return data.map(model => ({
        id: model.id,
        name: model.display_name,
      })) as Model[]
    }

    const data = (await res.json()) as { data: Model[] }

    return data.data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.error('Request timed out')
    } else {
      console.error(e)
    }
    return []
  }
}
