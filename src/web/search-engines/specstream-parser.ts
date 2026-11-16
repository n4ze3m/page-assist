// Page text per result in simple mode, so a few results stay within the
// context of small local models.
const MAX_CONTENT_CHARS = 4000

// The search endpoint caps the question at 2000 characters.
const MAX_QUERY_CHARS = 2000

const SEARCH_URL = "https://api.specstream.ai/v1/web-search"

interface SpecStreamSource {
  title?: string | null
  url?: string | null
  snippet?: string | null
}

interface SpecStreamPassage {
  url?: string | null
  text?: string | null
}

export interface SpecStreamAPIResponse {
  data?: {
    sources?: SpecStreamSource[]
    passages?: SpecStreamPassage[]
  }
}

export const buildSpecStreamSearchUrl = (
  query: string,
  withPassages: boolean
) => {
  const params = new URLSearchParams({ q: query.slice(0, MAX_QUERY_CHARS) })
  if (withPassages) {
    params.set("passages", "true")
  }
  return `${SEARCH_URL}?${params.toString()}`
}

export const parseSpecStreamResults = (response: SpecStreamAPIResponse) => {
  const passageByUrl = new Map<string, string>()
  for (const passage of response?.data?.passages ?? []) {
    if (passage?.url && passage.text) {
      passageByUrl.set(passage.url, passage.text)
    }
  }

  const results: { title: string; link: string; content: string }[] = []
  for (const source of response?.data?.sources ?? []) {
    if (!source?.url) continue
    results.push({
      title: source.title || "",
      link: source.url,
      content: (passageByUrl.get(source.url) || source.snippet || "").slice(
        0,
        MAX_CONTENT_CHARS
      )
    })
  }
  return results
}
