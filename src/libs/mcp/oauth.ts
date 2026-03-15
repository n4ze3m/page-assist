import { cleanUrl } from "~/libs/clean-url"
import { getPageShareUrl } from "~/services/ollama"
import type {
  McpOAuthClientRegistration,
  McpOAuthMetadata,
  McpOAuthTokens
} from "./types"

const generateRandomString = (length: number): string => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}

const base64UrlEncode = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export const generatePkce = async () => {
  const codeVerifier = generateRandomString(64)
  const encoded = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  const codeChallenge = base64UrlEncode(digest)

  return { codeVerifier, codeChallenge }
}

// --- OAuth Discovery ---

export type OAuthDiscoveryResult = {
  metadata: McpOAuthMetadata
}

const fetchJson = async (url: string): Promise<any> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.json()
}

const discoverFromPrmUrl = async (
  prmUrl: string
): Promise<OAuthDiscoveryResult> => {
  const prm = await fetchJson(prmUrl)

  const authServers: string[] = prm.authorization_servers || []
  if (authServers.length === 0) {
    throw new Error("No authorization servers found in protected resource metadata")
  }

  const authServerBase = cleanUrl(authServers[0])

  let authMeta: any
  try {
    authMeta = await fetchJson(
      `${authServerBase}/.well-known/openid-configuration`
    )
  } catch {
    authMeta = await fetchJson(
      `${authServerBase}/.well-known/oauth-authorization-server`
    )
  }

  if (!authMeta.authorization_endpoint || !authMeta.token_endpoint) {
    throw new Error("Authorization server metadata missing required endpoints")
  }

  return {
    metadata: {
      authorizationEndpoint: authMeta.authorization_endpoint,
      tokenEndpoint: authMeta.token_endpoint,
      registrationEndpoint: authMeta.registration_endpoint || undefined,
      issuer: authMeta.issuer || undefined,
      resourceMetadataUrl: prmUrl,
      scopesSupported: prm.scopes_supported || authMeta.scopes_supported
    }
  }
}

export const discoverOAuthFromMcpServer = async (
  mcpServerUrl: string
): Promise<OAuthDiscoveryResult> => {
  const serverUrl = cleanUrl(mcpServerUrl)
  try {
    const probeResponse = await fetch(serverUrl, { method: "POST" })

    if (probeResponse.status === 401) {
      const wwwAuth = probeResponse.headers.get("WWW-Authenticate") || ""
      const resourceMetadataMatch = wwwAuth.match(
        /resource_metadata="([^"]+)"/
      )

      if (resourceMetadataMatch) {
        return await discoverFromPrmUrl(resourceMetadataMatch[1])
      }
    }
  } catch {
  }

  const origin = new URL(serverUrl).origin
  const prmUrl = `${origin}/.well-known/oauth-protected-resource`

  return await discoverFromPrmUrl(prmUrl)
}

export const discoverOAuthFrom401 = async (
  wwwAuthenticate: string
): Promise<OAuthDiscoveryResult | null> => {
  const resourceMetadataMatch = wwwAuthenticate.match(
    /resource_metadata="([^"]+)"/
  )
  if (!resourceMetadataMatch) {
    return null
  }

  const prmUrl = resourceMetadataMatch[1]
  const prm = await fetchJson(prmUrl)

  const authServers: string[] = prm.authorization_servers || []
  if (authServers.length === 0) {
    return null
  }

  const authServerBase = cleanUrl(authServers[0])

  let authMeta: any
  try {
    authMeta = await fetchJson(
      `${authServerBase}/.well-known/openid-configuration`
    )
  } catch {
    authMeta = await fetchJson(
      `${authServerBase}/.well-known/oauth-authorization-server`
    )
  }

  if (!authMeta.authorization_endpoint || !authMeta.token_endpoint) {
    return null
  }

  return {
    metadata: {
      authorizationEndpoint: authMeta.authorization_endpoint,
      tokenEndpoint: authMeta.token_endpoint,
      registrationEndpoint: authMeta.registration_endpoint || undefined,
      issuer: authMeta.issuer || undefined,
      resourceMetadataUrl: prmUrl,
      scopesSupported: prm.scopes_supported || authMeta.scopes_supported
    }
  }
}

export const getOAuthRedirectUri = async (): Promise<string> => {
  const pageShareUrl = await getPageShareUrl()
  const base = cleanUrl(pageShareUrl).replace(/\/+$/, "")
  return `${base}/mcp/oauth/callback`
}

export const registerOAuthClient = async (
  registrationEndpoint: string,
  redirectUri: string,
  clientName: string = "Page Assist"
): Promise<McpOAuthClientRegistration> => {
  const response = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Dynamic client registration failed: ${text}`)
  }

  const data = await response.json()
  console.log("[MCP OAuth] DCR response:", JSON.stringify(data, null, 2))

  return {
    clientId: data.client_id,
    clientSecret: data.client_secret || undefined,
    registrationAccessToken: data.registration_access_token || undefined,
    redirectUris: data.redirect_uris
  }
}

export const buildAuthorizationUrl = ({
  metadata,
  clientRegistration,
  redirectUri,
  codeChallenge,
  state,
  scopes
}: {
  metadata: McpOAuthMetadata
  clientRegistration: McpOAuthClientRegistration
  redirectUri: string
  codeChallenge: string
  state: string
  scopes?: string[]
}): string => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientRegistration.clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state
  })

  if (scopes && scopes.length > 0) {
    params.set("scope", scopes.join(" "))
  }

  return `${metadata.authorizationEndpoint}?${params.toString()}`
}

export const exchangeCodeForTokens = async ({
  metadata,
  clientRegistration,
  code,
  redirectUri,
  codeVerifier
}: {
  metadata: McpOAuthMetadata
  clientRegistration: McpOAuthClientRegistration
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<McpOAuthTokens> => {
  console.log("[MCP OAuth] Token exchange redirect_uri:", redirectUri)
  console.log("[MCP OAuth] Token exchange client_id:", clientRegistration.clientId)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientRegistration.clientId
  })

  if (clientRegistration.clientSecret) {
    body.set("client_secret", clientRegistration.clientSecret)
  }

  const response = await fetch(metadata.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    tokenType: data.token_type || "Bearer",
    expiresAt: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
    scope: data.scope || undefined
  }
}

export const refreshOAuthTokens = async ({
  metadata,
  clientRegistration,
  refreshToken
}: {
  metadata: McpOAuthMetadata
  clientRegistration: McpOAuthClientRegistration
  refreshToken: string
}): Promise<McpOAuthTokens> => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientRegistration.clientId
  })

  if (clientRegistration.clientSecret) {
    body.set("client_secret", clientRegistration.clientSecret)
  }

  const response = await fetch(metadata.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenType: data.token_type || "Bearer",
    expiresAt: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
    scope: data.scope || undefined
  }
}

export const isOAuthTokenExpired = (tokens?: McpOAuthTokens): boolean => {
  if (!tokens?.accessToken) return true
  if (!tokens.expiresAt) return false
  return Date.now() > tokens.expiresAt - 60_000
}

export const hasValidOAuthTokens = (tokens?: McpOAuthTokens): boolean => {
  if (!tokens?.accessToken) return false
  return !isOAuthTokenExpired(tokens)
}
