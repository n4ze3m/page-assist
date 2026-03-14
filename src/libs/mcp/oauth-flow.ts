import { browser } from "wxt/browser"
import { McpServerDb, updateMcpServer } from "@/db/dexie/mcp"
import {
  generatePkce,
  discoverOAuthFromMcpServer,
  getOAuthRedirectUri,
  registerOAuthClient,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshOAuthTokens,
  isOAuthTokenExpired
} from "./oauth"
import { inspectMcpServerTools } from "./remote-tools"
import type { McpServer } from "./types"

type PendingOAuthFlow = {
  serverId: string
  state: string
  codeVerifier: string
  redirectUri: string
  tabId: number
  metadata: McpServer["oauthMetadata"]
  clientRegistration: McpServer["oauthClientRegistration"]
}

let pendingFlow: PendingOAuthFlow | null = null

const generateState = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}


export const startMcpOAuthFlow = async (
  server: McpServer
): Promise<{ success: boolean; error?: string }> => {
  try {
    const discovery = await discoverOAuthFromMcpServer(server.url)
    const metadata = discovery.metadata
    const redirectUri = await getOAuthRedirectUri()
    let clientRegistration = server.oauthClientRegistration
    if (!clientRegistration && metadata.registrationEndpoint) {
      clientRegistration = await registerOAuthClient(
        metadata.registrationEndpoint,
        redirectUri,
        `Page Assist - ${server.name}`
      )
      await updateMcpServer({
        id: server.id,
        oauthMetadata: metadata,
        oauthClientRegistration: clientRegistration,
        authType: "oauth"
      })
    }

    if (!clientRegistration) {
      return {
        success: false,
        error:
          "No client registration available. The server does not support dynamic client registration. Please configure OAuth client credentials manually."
      }
    }

    const { codeVerifier, codeChallenge } = await generatePkce()
    const state = generateState()
    const authUrl = buildAuthorizationUrl({
      metadata,
      clientRegistration,
      redirectUri,
      codeChallenge,
      state,
      scopes: metadata.scopesSupported
    })

    const tab = await browser.tabs.create({ url: authUrl })

    pendingFlow = {
      serverId: server.id,
      state,
      codeVerifier,
      redirectUri,
      tabId: tab.id!,
      metadata,
      clientRegistration
    }

    startTabMonitoring(redirectUri)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}


const startTabMonitoring = (redirectUri: string) => {
  const listener = async (
    tabId: number,
    changeInfo: { url?: string; status?: string }
  ) => {
    if (!pendingFlow) {
      browser.tabs.onUpdated.removeListener(listener)
      return
    }

    if (tabId !== pendingFlow.tabId) return
    if (!changeInfo.url) return

    if (!changeInfo.url.startsWith(redirectUri)) return

    const url = new URL(changeInfo.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")

    browser.tabs.onUpdated.removeListener(listener)

    if (error) {
      const errorDesc = url.searchParams.get("error_description") || error
      pendingFlow = null
      console.error("MCP OAuth error:", errorDesc)
      return
    }

    if (!code || state !== pendingFlow.state) {
      pendingFlow = null
      return
    }

    try {
      const tokens = await exchangeCodeForTokens({
        metadata: pendingFlow.metadata!,
        clientRegistration: pendingFlow.clientRegistration!,
        code,
        redirectUri: pendingFlow.redirectUri,
        codeVerifier: pendingFlow.codeVerifier
      })

      const updatedServer = await updateMcpServer({
        id: pendingFlow.serverId,
        authType: "oauth",
        oauthTokens: tokens,
        oauthMetadata: pendingFlow.metadata,
        oauthClientRegistration: pendingFlow.clientRegistration
      })

      try {
        await browser.tabs.remove(tabId)
      } catch {
      }
      try {
        const validation = await inspectMcpServerTools(updatedServer)
        await updateMcpServer({
          id: updatedServer.id,
          cachedTools: validation.cachedTools,
          toolsLastSyncedAt: validation.toolsLastSyncedAt,
          toolsSyncError: undefined
        })
      } catch (toolErr) {
        console.error("MCP OAuth: tools fetch after auth failed:", toolErr)
      }
    } catch (err) {
      console.error("MCP OAuth token exchange failed:", err)
    } finally {
      pendingFlow = null
    }
  }

  browser.tabs.onUpdated.addListener(listener)
  const closeListener = (closedTabId: number) => {
    if (pendingFlow && closedTabId === pendingFlow.tabId) {
      pendingFlow = null
      browser.tabs.onUpdated.removeListener(listener)
      browser.tabs.onRemoved.removeListener(closeListener)
    }
  }
  browser.tabs.onRemoved.addListener(closeListener)
}


export const ensureFreshOAuthTokens = async (
  server: McpServer
): Promise<McpServer | null> => {
  if (server.authType !== "oauth" || !server.oauthTokens) return null

  if (!isOAuthTokenExpired(server.oauthTokens)) {
    return server
  }

  if (!server.oauthTokens.refreshToken || !server.oauthMetadata || !server.oauthClientRegistration) {
    return null
  }

  try {
    const newTokens = await refreshOAuthTokens({
      metadata: server.oauthMetadata,
      clientRegistration: server.oauthClientRegistration,
      refreshToken: server.oauthTokens.refreshToken
    })

    const updated = await updateMcpServer({
      id: server.id,
      oauthTokens: newTokens
    })

    return updated
  } catch {
    return null
  }
}


export const disconnectMcpOAuth = async (serverId: string) => {
  await updateMcpServer({
    id: serverId,
    authType: "none",
    oauthTokens: undefined
  })
}
