type Model = {
  id: string
  name?: string
  display_name?: string
  type: string
}

export const getAllOpenAIModels = async (baseUrl: string, apiKey?: string) => {
  try {
    const url = `${baseUrl}/models`
    const headers = apiKey
      ? {
        Authorization: `Bearer ${apiKey}`
      }
      : {}

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

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
      console.log('Request timed out')
    } else {
      console.log(e)
    }
    return []
  }
}
