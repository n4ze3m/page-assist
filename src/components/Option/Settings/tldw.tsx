import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import {
  Segmented,
  Space,
  Input,
  Alert,
  Form,
  Spin,
  Button,
  Collapse,
  Tag
} from "antd"
import { Link, useNavigate } from "react-router-dom"
import React, { useEffect, useState } from "react"
import { browser } from "wxt/browser"
import { useTranslation } from "react-i18next"
import { tldwClient, TldwConfig } from "@/services/tldw/TldwApiClient"
import { tldwAuth } from "@/services/tldw/TldwAuth"
import { SettingsSkeleton } from "@/components/Common/Settings/SettingsSkeleton"
import { DEFAULT_TLDW_API_KEY } from "@/services/tldw-server"
import { apiSend } from "@/services/api-send"
import { useAntdMessage } from "@/hooks/useAntdMessage"
import { useConnectionStore } from "@/store/connection"
import { mapMultiUserLoginErrorMessage } from "@/services/auth-errors"
import { ServerOverviewHint } from "@/components/Common/ServerOverviewHint"

type TimeoutPresetKey = 'balanced' | 'extended'

type TimeoutValues = {
  request: number
  stream: number
  chatRequest: number
  chatStream: number
  ragRequest: number
  media: number
  upload: number
}

const TIMEOUT_PRESETS: Record<TimeoutPresetKey, TimeoutValues> = {
  balanced: {
    request: 10,
    stream: 15,
    chatRequest: 10,
    chatStream: 15,
    ragRequest: 10,
    media: 60,
    upload: 60
  },
  extended: {
    request: 20,
    stream: 30,
    chatRequest: 20,
    chatStream: 30,
    ragRequest: 20,
    media: 90,
    upload: 90
  }
}

type CoreStatus = 'unknown' | 'checking' | 'connected' | 'failed'
type RagStatus = 'healthy' | 'unhealthy' | 'unknown' | 'checking'

export const TldwSettings = () => {
  const { t } = useTranslation(["settings", "common"])
  const message = useAntdMessage()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [initializingError, setInitializingError] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
  const [connectionDetail, setConnectionDetail] = useState<string>("")
  const [coreStatus, setCoreStatus] = useState<CoreStatus>("unknown")
  const [ragStatus, setRagStatus] = useState<RagStatus>("unknown")
  const [authMode, setAuthMode] = useState<'single-user' | 'multi-user'>('single-user')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [serverUrl, setServerUrl] = useState("")
  const [requestTimeoutSec, setRequestTimeoutSec] = useState<number>(10)
  const [streamIdleTimeoutSec, setStreamIdleTimeoutSec] = useState<number>(15)
  const [chatRequestTimeoutSec, setChatRequestTimeoutSec] = useState<number>(10)
  const [chatStreamIdleTimeoutSec, setChatStreamIdleTimeoutSec] = useState<number>(15)
  const [ragRequestTimeoutSec, setRagRequestTimeoutSec] = useState<number>(10)
  const [mediaRequestTimeoutSec, setMediaRequestTimeoutSec] = useState<number>(60)
  const [uploadRequestTimeoutSec, setUploadRequestTimeoutSec] = useState<number>(60)
  const [timeoutPreset, setTimeoutPreset] = useState<TimeoutPresetKey | 'custom'>('balanced')
  const [showDefaultKeyWarning, setShowDefaultKeyWarning] = useState(false)

  const determinePreset = (values: TimeoutValues): TimeoutPresetKey | 'custom' => {
    for (const [key, presetValues] of Object.entries(TIMEOUT_PRESETS) as [TimeoutPresetKey, typeof TIMEOUT_PRESETS[TimeoutPresetKey]][]) {
      const matches =
        presetValues.request === values.request &&
        presetValues.stream === values.stream &&
        presetValues.chatRequest === values.chatRequest &&
        presetValues.chatStream === values.chatStream &&
        presetValues.ragRequest === values.ragRequest &&
        presetValues.media === values.media &&
        presetValues.upload === values.upload
      if (matches) {
        return key
      }
    }
    return 'custom'
  }

  const applyTimeoutPreset = (preset: TimeoutPresetKey) => {
    const presetValues = TIMEOUT_PRESETS[preset]
    setRequestTimeoutSec(presetValues.request)
    setStreamIdleTimeoutSec(presetValues.stream)
    setChatRequestTimeoutSec(presetValues.chatRequest)
    setChatStreamIdleTimeoutSec(presetValues.chatStream)
    setRagRequestTimeoutSec(presetValues.ragRequest)
    setMediaRequestTimeoutSec(presetValues.media)
    setUploadRequestTimeoutSec(presetValues.upload)
    setTimeoutPreset(preset)
  }

  const parseSeconds = (value: string, fallback: number) => {
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? fallback : parsed
  }

  const coreStatusColor = (status: CoreStatus) => {
    switch (status) {
      case "connected":
        return "green"
      case "failed":
        return "red"
      default:
        return "default"
    }
  }

  const coreStatusLabel = (status: CoreStatus) => {
    switch (status) {
      case "checking":
        return t("settings:tldw.connection.coreChecking", "Core: checking…")
      case "connected":
        return t("settings:tldw.connection.coreOk", "Core: reachable")
      case "failed":
        return t("settings:tldw.connection.coreFailed", "Core: unreachable")
      default:
        return t("settings:tldw.connection.coreUnknown", "Core: waiting")
    }
  }

  const ragStatusColor = (status: RagStatus) => {
    switch (status) {
      case "healthy":
        return "green"
      case "unhealthy":
        return "red"
      default:
        return "default"
    }
  }

  const ragStatusLabel = (status: RagStatus) => {
    switch (status) {
      case "checking":
        return t("settings:tldw.connection.ragChecking", "RAG: checking…")
      case "healthy":
        return t("settings:tldw.connection.ragHealthy", "RAG: healthy")
      case "unhealthy":
        return t("settings:tldw.connection.ragUnhealthy", "RAG: needs attention")
      default:
        return t("settings:tldw.connection.ragUnknown", "RAG: waiting")
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    setInitializingError(null)
    try {
      const config = await tldwClient.getConfig()
      if (config) {
        setAuthMode(config.authMode)
        setServerUrl(config.serverUrl)
        const nextTimeouts = { ...TIMEOUT_PRESETS.balanced }
        if (typeof (config as any).requestTimeoutMs === 'number') nextTimeouts.request = Math.round((config as any).requestTimeoutMs / 1000)
        if (typeof (config as any).streamIdleTimeoutMs === 'number') nextTimeouts.stream = Math.round((config as any).streamIdleTimeoutMs / 1000)
        if (typeof (config as any).chatRequestTimeoutMs === 'number') nextTimeouts.chatRequest = Math.round((config as any).chatRequestTimeoutMs / 1000)
        if (typeof (config as any).chatStreamIdleTimeoutMs === 'number') nextTimeouts.chatStream = Math.round((config as any).chatStreamIdleTimeoutMs / 1000)
        if (typeof (config as any).ragRequestTimeoutMs === 'number') nextTimeouts.ragRequest = Math.round((config as any).ragRequestTimeoutMs / 1000)
        if (typeof (config as any).mediaRequestTimeoutMs === 'number') nextTimeouts.media = Math.round((config as any).mediaRequestTimeoutMs / 1000)
        if (typeof (config as any).uploadRequestTimeoutMs === 'number') nextTimeouts.upload = Math.round((config as any).uploadRequestTimeoutMs / 1000)

        setRequestTimeoutSec(nextTimeouts.request)
        setStreamIdleTimeoutSec(nextTimeouts.stream)
        setChatRequestTimeoutSec(nextTimeouts.chatRequest)
        setChatStreamIdleTimeoutSec(nextTimeouts.chatStream)
        setRagRequestTimeoutSec(nextTimeouts.ragRequest)
        setMediaRequestTimeoutSec(nextTimeouts.media)
        setUploadRequestTimeoutSec(nextTimeouts.upload)
        setTimeoutPreset(determinePreset(nextTimeouts))
        form.setFieldsValue({
          serverUrl: config.serverUrl,
          apiKey: config.apiKey,
          authMode: config.authMode
        })
        
        // Check if logged in for multi-user mode
        if (config.authMode === 'multi-user' && config.accessToken) {
          setIsLoggedIn(true)
        }
      } else {
        setTimeoutPreset('balanced')
      }
      setInitializingError(null)
    } catch (error) {
      console.error('Failed to load config:', error)
      setInitializingError(
        (error as Error)?.message ||
          t('settings:tldw.loadError', 'Unable to load tldw server settings. Check your connection and try again.')
      )
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }

  const handleSave = async (values: any) => {
    setLoading(true)
    try {
      const config: Partial<TldwConfig & {
        requestTimeoutMs?: number
        streamIdleTimeoutMs?: number
        chatRequestTimeoutMs?: number
        chatStreamIdleTimeoutMs?: number
        ragRequestTimeoutMs?: number
        mediaRequestTimeoutMs?: number
        uploadRequestTimeoutMs?: number
      }> = {
        serverUrl: values.serverUrl,
        authMode: values.authMode,
        requestTimeoutMs: Math.max(1, Math.round(Number(requestTimeoutSec) || 10)) * 1000,
        streamIdleTimeoutMs: Math.max(1, Math.round(Number(streamIdleTimeoutSec) || 15)) * 1000,
        chatRequestTimeoutMs: Math.max(1, Math.round(Number(chatRequestTimeoutSec) || requestTimeoutSec || 10)) * 1000,
        chatStreamIdleTimeoutMs: Math.max(1, Math.round(Number(chatStreamIdleTimeoutSec) || streamIdleTimeoutSec || 15)) * 1000,
        ragRequestTimeoutMs: Math.max(1, Math.round(Number(ragRequestTimeoutSec) || requestTimeoutSec || 10)) * 1000,
        mediaRequestTimeoutMs: Math.max(1, Math.round(Number(mediaRequestTimeoutSec) || requestTimeoutSec || 10)) * 1000,
        uploadRequestTimeoutMs: Math.max(1, Math.round(Number(uploadRequestTimeoutSec) || mediaRequestTimeoutSec || 60)) * 1000
      }

      if (values.authMode === 'single-user') {
        config.apiKey = values.apiKey
        // Clear multi-user tokens
        config.accessToken = undefined
        config.refreshToken = undefined
      }

      await tldwClient.updateConfig(config)

      // Request optional host permission for the configured origin on Chromium-based browsers
      try {
        const origin = new URL(values.serverUrl).origin
        // @ts-ignore chrome may be undefined on Firefox builds
        if (typeof chrome !== 'undefined' && chrome.permissions && chrome.permissions.request) {
          // @ts-ignore callback style API
          chrome.permissions.request({ origins: [origin + '/*'] }, (granted: boolean) => {
            if (!granted) {
              console.warn('Permission not granted for origin:', origin)
            }
          })
        }
      } catch (e) {
        console.warn('Could not request optional host permission:', e)
      }
      message.success(t("settings:savedSuccessfully"))
      
      // Test connection after saving
      await testConnection()
    } catch (error) {
      message.error(t("settings:saveFailed"))
      console.error('Failed to save config:', error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus(null)
    setConnectionDetail("")
    setCoreStatus("checking")
    setRagStatus("unknown")
    
    try {
      const values = form.getFieldsValue()
      let success = false

      // Test core connectivity via the health endpoint only, so we never
      // rely on the LLM provider for connection checks.
      const baseUrl = String(values.serverUrl || '').replace(/\/$/, '')
      const singleUser = values.authMode === "single-user"
      const hasApiKey =
        singleUser && typeof values.apiKey === "string" && values.apiKey.trim().length > 0

      const resp = await apiSend({
        path: `${baseUrl}/api/v1/health` as any,
        method: "GET",
        // For single-user mode, send the API key explicitly and bypass
        // background auth injection so we validate the current form values.
        headers:
          hasApiKey && baseUrl
            ? { "X-API-KEY": String(values.apiKey).trim() }
            : undefined,
        noAuth: hasApiKey && baseUrl ? true : false
      })

      success = !!resp?.ok
      setCoreStatus(success ? "connected" : "failed")

      if (!success) {
        const code = resp?.status
        const detail = resp?.error || ""

        if (code === 401 || code === 403) {
          const hint =
            code === 401
              ? t(
                  "settings:tldw.errors.invalidApiKey",
                  "Invalid API key"
                )
              : t(
                  "settings:tldw.errors.forbidden",
                  "Forbidden (check permissions)"
                )
          const healthHint = t(
            "settings:tldw.errors.seeHealth",
            "Open Health & diagnostics for more details."
          )
          const suffix = code ? ` — HTTP ${code}` : ""
          const extra = detail ? ` (${detail})` : ""
          setConnectionDetail(`${hint}${suffix} — ${healthHint}${extra}`)
        } else {
          const base = t(
            "settings:tldw.errors.serverUnreachableDetailed",
            "Server not reachable. Check that your tldw_server is running and that your browser can reach it, then try again. Health & diagnostics can help debug connectivity issues."
          )
          const suffix = code ? ` — HTTP ${code}` : ""
          const extra = detail ? ` (${detail})` : ""
          setConnectionDetail(`${base}${suffix}${extra}`)
        }
      }

      setConnectionStatus(success ? 'success' : 'error')
      // Probe RAG health after core connection test when server URL is present
      try {
        setRagStatus("checking")
        await tldwClient.initialize()
        const rag = await tldwClient.ragHealth()
        setRagStatus('healthy')
      } catch (e) {
        setRagStatus('unhealthy')
      }
      
      if (success) {
        message.success(t('settings:tldw.connection.success', 'Connection successful!'))
        if (
          values.authMode === 'single-user' &&
          typeof values.apiKey === 'string' &&
          values.apiKey.trim() === DEFAULT_TLDW_API_KEY
        ) {
          setShowDefaultKeyWarning(true)
        } else {
          setShowDefaultKeyWarning(false)
        }
        await tldwClient.initialize()
        try {
          // Refresh shared connection state so entry views transition
          // from the connection card to the live chat/media UI.
          await useConnectionStore.getState().checkOnce()
        } catch {
          // Best-effort only; ignore failures here.
        }
      } else {
        message.error(t('settings:tldw.connection.failed', 'Connection failed. Please check your settings.'))
        setShowDefaultKeyWarning(false)
      }
    } catch (error) {
      setConnectionStatus('error')
      setCoreStatus("failed")
      const raw = (error as any)?.message || ''
      const friendly =
        raw && /network|timeout|failed to fetch/i.test(raw)
          ? t(
              'settings:tldw.errors.serverUnreachableDetailed',
              'Server not reachable. Check that your tldw_server is running and that your browser can reach it, then try again. Health & diagnostics can help debug connectivity issues.'
            )
          : raw ||
            t(
              'settings:tldw.errors.connectionFailedDetailed',
              'Connection failed. Please check your server URL and API key, then open Health & diagnostics for more details.'
            )
      setConnectionDetail(friendly)
      message.error(friendly)
      console.error('Connection test failed:', error)
    } finally {
      setTestingConnection(false)
    }
  }

  const grantSiteAccess = async () => {
    try {
      const values = form.getFieldsValue()
      const urlStr = String(values?.serverUrl || serverUrl || '')
      if (!urlStr) {
        message.warning(t('settings:enterServerUrlFirst', 'Enter a server URL first'))
        return
      }
      const origin = new URL(urlStr).origin
      // @ts-ignore chrome may be undefined on Firefox builds
      if (typeof chrome === 'undefined' || !chrome?.permissions?.request) {
        message.info(t('settings:siteAccessChromiumOnly', 'Site access is only needed on Chrome/Edge'))
        return
      }
      // @ts-ignore callback style API
      chrome.permissions.request({ origins: [origin + '/*'] }, (granted: boolean) => {
        if (granted) message.success(t('settings:siteAccessGranted', 'Host permission granted for {{origin}}', { origin }))
        else message.warning(t('settings:siteAccessDenied', 'Permission not granted for {{origin}}', { origin }))
      })
    } catch (e: any) {
      message.error(t('settings:siteAccessFailed', 'Failed to request site access: {{msg}}', { msg: e?.message || String(e) }))
    }
  }

  const handleLogin = async () => {
    try {
      const values = await form.validateFields(['username', 'password'])
      setLoading(true)
      
      await tldwAuth.login({
        username: values.username,
        password: values.password
      })
      
      setIsLoggedIn(true)
      message.success(t('settings:tldw.login.success', 'Login successful!'))
      
      // Clear password field
      form.setFieldValue('password', '')
      
      // Test connection after login
      await testConnection()
    } catch (error: any) {
      const friendly = mapMultiUserLoginErrorMessage(
        t,
        error,
        'settings'
      )
      message.error(friendly)
      console.error('Login failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoading(true)
      await tldwAuth.logout()
      setIsLoggedIn(false)
      message.success(t('settings:tldw.logout.success', 'Logged out successfully'))
    } catch (error) {
      message.error(t('settings:tldw.logout.failed', 'Logout failed'))
      console.error('Logout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="max-w-2xl">
        <SettingsSkeleton sections={3} />
      </div>
    )
  }

  return (
    <Spin
      spinning={loading}
      tip={loading ? t('common:saving', 'Saving...') : undefined}>
      <div className="max-w-2xl">
        {initializingError && (
          <Alert
            type="error"
            showIcon
            closable
            className="mb-4"
            message={t('settings:tldw.loadError', 'Unable to load tldw settings')}
            description={initializingError}
            onClose={() => setInitializingError(null)}
          />
        )}
        {showDefaultKeyWarning && authMode === 'single-user' && (
          <Alert
            type="warning"
            showIcon
            closable
            className="mb-4"
            message={t(
              'settings:tldw.defaultKeyWarning.title',
              'Default demo API key in use'
            )}
            description={t(
              'settings:tldw.defaultKeyWarning.body',
              'You are using the default demo API key for tldw_server. For production or shared deployments, rotate the key on your server and update it here. Continue at your own risk.'
            )}
            onClose={() => setShowDefaultKeyWarning(false)}
          />
        )}
        <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="mb-2 font-semibold">
            {t(
              "settings:tldw.about.title",
              "About tldw server integration"
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t(
              "settings:tldw.about.description",
              "tldw server turns this extension into a full workspace for chat, knowledge search, and media."
            )}
          </p>
          <ServerOverviewHint />
        </div>
        <div className="mb-4 p-2 rounded border border-transparent bg-transparent flex items-center justify-between transition-colors duration-150 hover:border-gray-200 hover:bg-gray-50 dark:border-transparent dark:hover:border-gray-700 dark:hover:bg-[#1c1c1c]">
          <div className="text-sm text-gray-800 dark:text-gray-100">
            <span className="mr-2 font-medium">{t('settings:tldw.serverLabel', 'Server:')}</span>
            <span className="text-gray-600 dark:text-gray-300 break-all">{serverUrl || t('settings:tldw.notConfigured', 'Not configured')}</span>
          </div>
          <Space>
            <Link to="/settings/health">
              <Button>{t('settings:tldw.buttons.health', 'Health')}</Button>
            </Link>
            <Button type="primary" onClick={testConnection} loading={testingConnection}>{t('settings:tldw.buttons.recheck', 'Recheck')}</Button>
          </Space>
        </div>
        <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('settings:tldw.serverConfigTitle', 'tldw Server Configuration')}</h2>
        
        <Form
          form={form}
          onFinish={handleSave}
          layout="vertical"
          initialValues={{
            authMode: 'single-user',
            apiKey: DEFAULT_TLDW_API_KEY
          }}
        >
          <Form.Item
            label={t('settings:tldw.fields.serverUrl.label', 'Server URL')}
            name="serverUrl"
            rules={[
              { required: true, message: t('settings:tldw.fields.serverUrl.required', 'Please enter the server URL') as string },
              { type: 'url', message: t('settings:tldw.fields.serverUrl.invalid', 'Please enter a valid URL') as string }
            ]}
            extra={t('settings:tldw.fields.serverUrl.extra', 'The URL of your tldw_server instance (e.g., http://localhost:8000)')}
          >
            <Input placeholder={t('settings:tldw.fields.serverUrl.placeholder', 'http://localhost:8000') as string} />
          </Form.Item>
          <Form.Item
            label={t('settings:tldw.authMode.label', 'Authentication Mode')}
            name="authMode"
            rules={[{ required: true }]}
          >
            <Segmented
              options={[
                { label: t('settings:tldw.authMode.single', 'Single User (API Key)'), value: 'single-user' },
                { label: t('settings:tldw.authMode.multi', 'Multi User (Login)'), value: 'multi-user' }
              ]}
              onChange={(value) => setAuthMode(value as 'single-user' | 'multi-user')}
            />
          </Form.Item>
          {authMode === 'single-user' && (
            <Form.Item
              label={t('settings:tldw.fields.apiKey.label', 'API Key')}
              name="apiKey"
              rules={[{ required: true, message: t('settings:tldw.fields.apiKey.required', 'Please enter your API key') }]}
              extra={t('settings:tldw.fields.apiKey.extra', 'Your tldw_server API key for authentication')}
            >
              <Input.Password placeholder={t('settings:tldw.fields.apiKey.placeholder', 'Enter your API key')} />
            </Form.Item>
          )}

          {authMode === 'multi-user' && !isLoggedIn && (
            <>
              <Alert
                message={t('settings:tldw.loginRequired.title', 'Login Required')}
                description={t('settings:tldw.loginRequired.description', 'Please login with your tldw_server credentials')}
                type="info"
                showIcon
                className="mb-4"
              />
              
              <Form.Item
                label={t('settings:tldw.fields.username.label', 'Username')}
                name="username"
                rules={[{ required: true, message: t('settings:tldw.fields.username.required', 'Please enter your username') }]}
              >
                <Input placeholder={t('settings:tldw.fields.username.placeholder', 'Enter username')} />
              </Form.Item>

              <Form.Item
                label={t('settings:tldw.fields.password.label', 'Password')}
                name="password"
                rules={[{ required: true, message: t('settings:tldw.fields.password.required', 'Please enter your password') }]}
              >
                <Input.Password placeholder={t('settings:tldw.fields.password.placeholder', 'Enter password')} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" onClick={handleLogin}>
                  {t('settings:tldw.buttons.login', 'Login')}
                </Button>
              </Form.Item>
            </>
          )}

          {authMode === 'multi-user' && isLoggedIn && (
            <Alert
              message={t('settings:tldw.loggedIn.title', 'Logged In')}
              description={t('settings:tldw.loggedIn.description', 'You are currently logged in to tldw_server')}
              type="success"
              showIcon
              action={
                <Button size="small" danger onClick={handleLogout}>
                  {t('settings:tldw.buttons.logout', 'Logout')}
                </Button>
              }
              className="mb-4"
            />
          )}

          <Space className="w-full justify-between">
            <Space>
              <Button type="primary" htmlType="submit">
                {t('common:save')}
              </Button>

              <Button
                onClick={testConnection}
                loading={testingConnection}
                icon={
                  connectionStatus === 'success' ? (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  ) : connectionStatus === 'error' ? (
                    <XMarkIcon className="w-4 h-4 text-red-500" />
                  ) : null
                }
              >
                {t('settings:tldw.buttons.testConnection', 'Test Connection')}
              </Button>

              {import.meta.env.BROWSER !== 'firefox' && (
                <Button onClick={grantSiteAccess}>
                  {t('settings:tldw.buttons.grantSiteAccess', 'Grant Site Access')}
                </Button>
              )}
            </Space>

            <div className="flex flex-col items-start gap-1 ml-4">
              {testingConnection && (
                <span className="text-xs text-gray-500">
                  {t(
                    "settings:tldw.connection.checking",
                    "Checking connection and RAG health…"
                  )}
                </span>
              )}
              {connectionStatus && !testingConnection && (
                <span
                  className={`text-sm ${
                    connectionStatus === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}>
                  {connectionStatus === "success"
                    ? t(
                        "settings:tldw.connection.success",
                        "Connection successful!"
                      )
                    : t(
                        "settings:tldw.connection.failed",
                        "Connection failed. Please check your settings."
                      )}
                </span>
              )}
              {connectionDetail && connectionStatus !== "success" && (
                <span className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{connectionDetail}</span>
                  <button
                    type="button"
                    className="underline text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => {
                      try {
                        navigate("/settings/health")
                      } catch {
                        // ignore navigation failure
                      }
                    }}>
                    {t(
                      "settings:healthSummary.diagnostics",
                      "Health & diagnostics"
                    )}
                  </button>
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-medium">
                  {t("settings:tldw.connection.checksLabel", "Checks")}
                </span>
                <Tag
                  color={coreStatusColor(coreStatus)}>
                  {coreStatusLabel(coreStatus)}
                </Tag>
                <Tag
                  color={ragStatusColor(ragStatus)}>
                  {ragStatusLabel(ragStatus)}
                </Tag>
              </div>
            </div>
          </Space>
          <Collapse
            className="mt-4"
            items={[
              {
                key: 'adv',
                label: t('settings:tldw.advancedTimeouts'),
                children: (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {t('settings:tldw.timeoutPresetLabel')}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <Segmented
                          value={timeoutPreset === 'extended' ? 'extended' : 'balanced'}
                          onChange={(value) => applyTimeoutPreset(value as TimeoutPresetKey)}
                          options={[
                            {
                              label: t('settings:tldw.timeoutPresetBalanced'),
                              value: 'balanced'
                            },
                            {
                              label: t('settings:tldw.timeoutPresetExtended'),
                              value: 'extended'
                            }
                          ]}
                        />
                        {timeoutPreset === 'custom' && (
                          <Tag color="default">
                            {t('settings:tldw.timeoutPresetCustom')}
                          </Tag>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {t('settings:tldw.timeoutPresetHint')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.requestTimeout')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={requestTimeoutSec}
                          onChange={(e) => {
                            setRequestTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.request
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          placeholder="10"
                          suffix="s"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {t('settings:tldw.hints.requestTimeout', {
                            defaultValue:
                              'Abort initial requests if no response within this time. Default: {{seconds}}s.',
                            seconds: TIMEOUT_PRESETS.balanced.request
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.streamingIdle')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={streamIdleTimeoutSec}
                          onChange={(e) => {
                            setStreamIdleTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.stream
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          placeholder="15"
                          suffix="s"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {t('settings:tldw.hints.streamingIdle', {
                            defaultValue:
                              'Abort streaming if no updates received within this time. Default: {{seconds}}s.',
                            seconds: TIMEOUT_PRESETS.balanced.stream
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.chatRequest')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={chatRequestTimeoutSec}
                          onChange={(e) => {
                            setChatRequestTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.chatRequest
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          suffix="s"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.chatStreamIdle')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={chatStreamIdleTimeoutSec}
                          onChange={(e) => {
                            setChatStreamIdleTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.chatStream
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          suffix="s"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.ragRequest')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={ragRequestTimeoutSec}
                          onChange={(e) => {
                            setRagRequestTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.ragRequest
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          suffix="s"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.mediaRequest')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={mediaRequestTimeoutSec}
                          onChange={(e) => {
                            setMediaRequestTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.media
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          suffix="s"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t('settings:tldw.uploadRequest')}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={uploadRequestTimeoutSec}
                          onChange={(e) => {
                            setUploadRequestTimeoutSec(
                              parseSeconds(
                                e.target.value,
                                TIMEOUT_PRESETS.balanced.upload
                              )
                            )
                            setTimeoutPreset('custom')
                          }}
                          suffix="s"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          applyTimeoutPreset('balanced')
                          message.success(t('settings:tldw.resetDone'))
                        }}
                      >
                        {t('settings:tldw.reset')}
                      </Button>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </Form>
      </div>
    </Spin>
  )
}
