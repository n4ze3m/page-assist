type Model = {
  id: string
  name?: string
}

export const getAllOpenAIModels = async (baseUrl: string, apiKey?: string) => {
  const url = `${baseUrl}/models`
  const headers = apiKey
    ? {
        Authorization: `Bearer ${apiKey}`
  }
    : {}

  const res = await fetch(url, {
    headers
  })

  if (!res.ok) {
    return []
  }

  const data = (await res.json()) as { data: Model[] }

  return data.data
}
