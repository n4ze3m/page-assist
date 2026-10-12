/** Detect PDF fetch targets for web_fetch / readability loading. */

export const looksLikePdfUrl = (url: string): boolean => {
  try {
    const { pathname } = new URL(url)
    return /\.pdf$/i.test(pathname)
  } catch {
    return /\.pdf($|\?|#)/i.test(url)
  }
}

export const isPdfResponse = (response: Response, url: string): boolean => {
  const contentType = (response.headers.get("content-type") || "").toLowerCase()
  return contentType.includes("application/pdf") || looksLikePdfUrl(url)
}
