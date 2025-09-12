import { Storage } from "@plasmohq/storage"
import { tldwClient } from "./TldwApiClient"
import { bgRequest } from "@/services/background-proxy"

export interface LoginCredentials {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
}

export interface UserInfo {
  id: number
  username: string
  email?: string
  role?: string
  is_active: boolean
}

export class TldwAuthService {
  private storage: Storage
  private refreshTimer: NodeJS.Timeout | null = null

  constructor() {
    this.storage = new Storage({
      area: "local"
    })
  }

  /**
   * Login for multi-user mode
   */
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const config = await tldwClient.getConfig()
    if (!config) {
      throw new Error('tldw server not configured')
    }

    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const response = await bgRequest<any>({
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })
    const tokens = response as TokenResponse
    
    // Update config with tokens
    await tldwClient.updateConfig({
      authMode: 'multi-user',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    })

    // Set up auto-refresh if expires_in is provided
    if (tokens.expires_in) {
      this.setupTokenRefresh(tokens.expires_in)
    }

    return tokens
  }

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    const config = await tldwClient.getConfig()
    if (!config || config.authMode !== 'multi-user') {
      return
    }

    // Try to logout on server
    try {
      await bgRequest<any>({ path: '/api/v1/auth/logout', method: 'POST' })
    } catch (error) {
      console.error('Server logout failed:', error)
    }

    // Clear local tokens
    await tldwClient.updateConfig({
      accessToken: undefined,
      refreshToken: undefined
    })

    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<TokenResponse> {
    const config = await tldwClient.getConfig()
    if (!config || !config.refreshToken) {
      throw new Error('No refresh token available')
    }

    const tokens = await bgRequest<TokenResponse>({
      path: '/api/v1/auth/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { refresh_token: config.refreshToken }
    })
    
    // Update access token
    await tldwClient.updateConfig({
      accessToken: tokens.access_token
    })

    // Set up auto-refresh if expires_in is provided
    if (tokens.expires_in) {
      this.setupTokenRefresh(tokens.expires_in)
    }

    return tokens
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<UserInfo> {
    const config = await tldwClient.getConfig()
    if (!config) {
      throw new Error('tldw server not configured')
    }

    const me = await bgRequest<UserInfo>({ path: '/api/v1/auth/me', method: 'GET' })
    return me
  }

  /**
   * Register a new user (if registration is enabled)
   */
  async register(username: string, password: string, email?: string, registrationCode?: string): Promise<any> {
    const config = await tldwClient.getConfig()
    if (!config) {
      throw new Error('tldw server not configured')
    }

    try {
      const data = await bgRequest<any>({
        path: '/api/v1/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { username, password, email, registration_code: registrationCode }
      })
      return data
    } catch (e: any) {
      throw new Error(e?.message || 'Registration failed')
    }
  }

  /**
   * Test API key for single-user mode
   */
  async testApiKey(serverUrl: string, apiKey: string): Promise<boolean> {
    try {
      const abs = `${String(serverUrl).replace(/\/$/, '')}/api/v1/health`
      const resp = await bgRequest<any>({ path: abs, method: 'GET', headers: { 'X-API-KEY': apiKey } })
      return !!resp
    } catch (error) {
      console.error('API key test failed:', error)
      return false
    }
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(expiresIn: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Refresh 5 minutes before expiry
    const refreshIn = Math.max(0, (expiresIn - 300) * 1000)
    
    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken()
      } catch (error) {
        console.error('Auto token refresh failed:', error)
        // Could emit an event here to notify UI
      }
    }, refreshIn)
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const config = await tldwClient.getConfig()
    if (!config) {
      return false
    }

    if (config.authMode === 'single-user') {
      return !!config.apiKey
    } else if (config.authMode === 'multi-user') {
      return !!config.accessToken
    }

    return false
  }

  /**
   * Get authentication headers
   */
  async getAuthHeaders(): Promise<HeadersInit> {
    const config = await tldwClient.getConfig()
    const headers: HeadersInit = {}

    if (!config) {
      return headers
    }

    if (config.authMode === 'single-user' && config.apiKey) {
      headers['X-API-KEY'] = config.apiKey
    } else if (config.authMode === 'multi-user' && config.accessToken) {
      headers['Authorization'] = `Bearer ${config.accessToken}`
    }

    return headers
  }
}

// Singleton instance
export const tldwAuth = new TldwAuthService()
