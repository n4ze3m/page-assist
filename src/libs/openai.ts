
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
  try {
    const url = `${baseUrl}/models`
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

    if (baseUrl === "https://api.together.xyz/v1") {
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
