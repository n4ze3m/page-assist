/**
 * Google Cloud Vertex AI authentication helpers.
 *
 * Vertex AI does not use a simple API key like Google AI Studio — it requires a
 * short-lived OAuth2 access token. To keep Page Assist fully browser-based (no
 * proxy), we mint those tokens directly from a service-account JSON using the
 * Web Crypto API (RS256 signed JWT -> Google token endpoint) and cache them
 * until shortly before they expire.
 *
 * The user may also paste a raw access token instead of a service-account JSON;
 * in that case we use it as-is (it will expire ~1h after they obtained it).
 */

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id?: string
  token_uri?: string
}

const GOOGLE_CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"

// Cache minted tokens per service account (keyed by client_email) so we don't
// sign a fresh JWT on every single chat request.
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

const base64UrlEncode = (input: ArrayBuffer | string): string => {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "")
  const binary = atob(normalized)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

/**
 * Try to parse a string as a service-account JSON. Returns null if the string
 * is not valid service-account JSON (e.g. the user pasted a raw access token).
 */
export const parseServiceAccount = (raw?: string): ServiceAccount | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && parsed.private_key && parsed.client_email) {
      return parsed as ServiceAccount
    }
    return null
  } catch {
    return null
  }
}

/**
 * Build the OpenAI-compatible Vertex AI base URL from a project id + location.
 *
 * Regional: https://{loc}-aiplatform.googleapis.com/v1beta1/projects/{p}/locations/{loc}/endpoints/openapi
 * Global:    https://aiplatform.googleapis.com/v1beta1/projects/{p}/locations/global/endpoints/openapi
 */
export const buildVertexBaseUrl = (
  projectId: string,
  location: string
): string => {
  const loc = (location || "us-central1").trim()
  const host =
    loc === "global"
      ? "aiplatform.googleapis.com"
      : `${loc}-aiplatform.googleapis.com`
  return `https://${host}/v1beta1/projects/${projectId.trim()}/locations/${loc}/endpoints/openapi`
}

export const isVertexAI = (baseUrl?: string): boolean => {
  if (!baseUrl) return false
  try {
    return new URL(baseUrl).hostname.endsWith("aiplatform.googleapis.com")
  } catch {
    return baseUrl.includes("aiplatform.googleapis.com")
  }
}

/**
 * Obtain a Google Cloud access token from a service-account JSON (with caching
 * + auto-refresh). If the supplied credentials are not a service-account JSON,
 * the raw value is returned and treated as an already-minted access token.
 */
export const getGoogleCloudAccessToken = async (
  credentials?: string
): Promise<string> => {
  const serviceAccount = parseServiceAccount(credentials)

  // Not a service account -> treat the raw string as an access token.
  if (!serviceAccount) {
    return (credentials || "").trim()
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const cached = tokenCache.get(serviceAccount.client_email)
  // Refresh a minute early to avoid races near expiry.
  if (cached && cached.expiresAt - 60 > nowSeconds) {
    return cached.token
  }

  const tokenUri = serviceAccount.token_uri || DEFAULT_TOKEN_URI
  const header = { alg: "RS256", typ: "JWT" }
  const claims = {
    iss: serviceAccount.client_email,
    scope: GOOGLE_CLOUD_SCOPE,
    aud: tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  }

  const unsignedToken = `${base64UrlEncode(
    JSON.stringify(header)
  )}.${base64UrlEncode(JSON.stringify(claims))}`

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to obtain Google Cloud access token: ${response.status} ${errorText}`
    )
  }

  const data = await response.json()
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600
  tokenCache.set(serviceAccount.client_email, {
    token: data.access_token,
    expiresAt: nowSeconds + expiresIn
  })

  return data.access_token
}

/**
 * Curated list of Gemini models available on Vertex AI. Vertex's OpenAI-compat
 * endpoint does not expose a reliable `/models` listing, so we surface a known
 * set. Model ids use the `google/` publisher prefix required by the
 * OpenAI-compatible surface.
 */
export const getVertexModels = (
  modelType: "chat" | "embedding" = "chat"
): { id: string; name: string }[] => {
  if (modelType === "embedding") {
    return [
      { id: "google/gemini-embedding-2", name: "gemini-embedding-2" },
      { id: "google/gemini-embedding-001", name: "gemini-embedding-001" },
      { id: "google/text-embedding-005", name: "text-embedding-005" },
      {
        id: "google/text-multilingual-embedding-002",
        name: "text-multilingual-embedding-002"
      }
    ]
  }

  return [
    { id: "google/gemini-3-pro-preview", name: "gemini-3-pro-preview" },
    { id: "google/gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview" },
    { id: "google/gemini-3.5-flash", name: "gemini-3.5-flash" },
    { id: "google/gemini-3-flash-preview", name: "gemini-3-flash-preview" },
    { id: "google/gemini-3.1-flash-lite", name: "gemini-3.1-flash-lite" },
    { id: "google/gemini-2.5-pro", name: "gemini-2.5-pro" },
    { id: "google/gemini-2.5-flash", name: "gemini-2.5-flash" },
    { id: "google/gemini-2.5-flash-lite", name: "gemini-2.5-flash-lite" },
    { id: "google/gemini-flash-latest", name: "gemini-flash-latest" },
    { id: "google/gemini-flash-lite-latest", name: "gemini-flash-lite-latest" }
  ]
}
