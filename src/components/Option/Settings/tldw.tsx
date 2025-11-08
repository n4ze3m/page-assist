import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import {
  Segmented,
  Space,
  Input,
  Alert,
  Form,
  message,
  Spin,
  Button,
  Collapse,
  Tag
} from "antd"
import { Link } from "react-router-dom"
import React, { useEffect, useState } from "react"
import { browser } from "wxt/browser"
import { useTranslation } from "react-i18next"
import { tldwClient, TldwConfig } from "@/services/tldw/TldwApiClient"
import { tldwAuth } from "@/services/tldw/TldwAuth"
import { SettingsSkeleton } from "@/components/Common/Settings/SettingsSkeleton"

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

export const TldwSettings = () => {
  const { t } = useTranslation(["settings", "common"])
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [initializingError, setInitializingError] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
  const [connectionDetail, setConnectionDetail] = useState<string>("")
  const [ragStatus, setRagStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>("unknown")
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
    
    try {
      const values = form.getFieldsValue()
      let success = false

      if (values.authMode === 'single-user' && values.apiKey) {
        // Validate against a strictly protected endpoint by provoking a non-auth error (400) vs 401
        // We intentionally use an invalid model id; if auth is valid, server should respond 400/404/422, not 401
        const { apiSend } = await import('@/services/api-send')
        const resp = await apiSend({
          path: `${String(values.serverUrl).replace(/\/$/, '')}/api/v1/chat/completions` as any,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': String(values.apiKey).trim() },
          body: { model: '__validation__', messages: [{ role: 'user', content: 'ping' }], stream: false },
          noAuth: true
        })
        // Treat any non-401 as valid auth; 401/403 invalid/forbidden
        success = resp?.status !== 401 && resp?.status !== 403
        if (!success) {
          const code = resp?.status
          const hint = code === 401
            ? t('settings:tldw.errors.invalidApiKey', 'Invalid API key')
            : code === 403
              ? t('settings:tldw.errors.forbidden', 'Forbidden (check permissions)')
              : (resp?.error || t('settings:tldw.errors.apiKeyValidationFailed', 'API key validation failed'))
          setConnectionDetail(`${hint}${code ? ` — HTTP ${code}` : ''}`)
        }
      } else {
        // Test basic health endpoint via background proxy
        const { apiSend } = await import('@/services/api-send')
        const resp = await apiSend({
          path: `${String(values.serverUrl).replace(/\/$/, '')}/api/v1/health` as any,
          method: 'GET'
        })
        success = !!resp?.ok
        if (!success) setConnectionDetail(`${t('settings:tldw.errors.serverUnreachable', 'Server unreachable')}${resp?.status ? ` — HTTP ${resp.status}` : ''}`)
      }

      setConnectionStatus(success ? 'success' : 'error')
      // Probe RAG health after core connection test when server URL is present
      try {
        await tldwClient.initialize()
        const rag = await tldwClient.ragHealth()
        setRagStatus('healthy')
      } catch (e) {
        setRagStatus('unhealthy')
      }
      
      if (success) {
        message.success(t('settings:tldw.connection.success', 'Connection successful!'))
        await tldwClient.initialize()
      } else {
        message.error(t('settings:tldw.connection.failed', 'Connection failed. Please check your settings.'))
      }
    } catch (error) {
      setConnectionStatus('error')
      const detail = (error as any)?.message || t('settings:tldw.connection.failedDetailed', 'Connection failed. Please check your server URL and API key.')
      setConnectionDetail(detail)
      message.error(detail)
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
      message.error(error.message || t('settings:tldw.login.failed', 'Login failed'))
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
        <div className="mb-4 p-2 rounded border dark:border-gray-600 bg-white dark:bg-[#171717] flex items-center justify-between">
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
            authMode: 'single-user'
          }}
        >
          <Form.Item
            label="Server URL"
            name="serverUrl"
            rules={[
              { required: true, message: 'Please enter the server URL' },
              { type: 'url', message: 'Please enter a valid URL' }
            ]}
            extra="The URL of your tldw_server instance (e.g., http://localhost:8000)"
          >
            <Input placeholder="http://localhost:8000" />
          </Form.Item>

          <Form.Item
            label="Authentication Mode"
            name="authMode"
            rules={[{ required: true }]}
          >
            <Segmented
              options={[
                { label: 'Single User (API Key)', value: 'single-user' },
                { label: 'Multi User (Login)', value: 'multi-user' }
              ]}
              onChange={(value) => setAuthMode(value as 'single-user' | 'multi-user')}
            />
          </Form.Item>

          <Collapse className="mt-4" items={[{
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
                        { label: t('settings:tldw.timeoutPresetBalanced'), value: 'balanced' },
                        { label: t('settings:tldw.timeoutPresetExtended'), value: 'extended' }
                      ]}
                    />
                    {timeoutPreset === 'custom' && (
                      <Tag color="default">{t('settings:tldw.timeoutPresetCustom')}</Tag>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {t('settings:tldw.timeoutPresetHint')}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.requestTimeout')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={requestTimeoutSec}
                      onChange={(e) => {
                        setRequestTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.request))
                        setTimeoutPreset('custom')
                      }}
                      placeholder="10"
                      addonAfter="s"
                    />
                    <div className="text-xs text-gray-500 mt-1">Abort initial requests if no response within this time. Default: 10s.</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.streamingIdle')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={streamIdleTimeoutSec}
                      onChange={(e) => {
                        setStreamIdleTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.stream))
                        setTimeoutPreset('custom')
                      }}
                      placeholder="15"
                      addonAfter="s"
                    />
                    <div className="text-xs text-gray-500 mt-1">Abort streaming if no updates received within this time. Default: 15s.</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.chatRequest')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={chatRequestTimeoutSec}
                      onChange={(e) => {
                        setChatRequestTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.chatRequest))
                        setTimeoutPreset('custom')
                      }}
                      addonAfter="s"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.chatStreamIdle')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={chatStreamIdleTimeoutSec}
                      onChange={(e) => {
                        setChatStreamIdleTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.chatStream))
                        setTimeoutPreset('custom')
                      }}
                      addonAfter="s"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.ragRequest')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={ragRequestTimeoutSec}
                      onChange={(e) => {
                        setRagRequestTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.ragRequest))
                        setTimeoutPreset('custom')
                      }}
                      addonAfter="s"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.mediaRequest')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={mediaRequestTimeoutSec}
                      onChange={(e) => {
                        setMediaRequestTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.media))
                        setTimeoutPreset('custom')
                      }}
                      addonAfter="s"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings:tldw.uploadRequest')}</label>
                    <Input
                      type="number"
                      min={1}
                      value={uploadRequestTimeoutSec}
                      onChange={(e) => {
                        setUploadRequestTimeoutSec(parseSeconds(e.target.value, TIMEOUT_PRESETS.balanced.upload))
                        setTimeoutPreset('custom')
                      }}
                      addonAfter="s"
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
          }]} />

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
              {t("common:save")}
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

            <Button onClick={grantSiteAccess}>
              {t('settings:tldw.buttons.grantSiteAccess', 'Grant Site Access')}
            </Button>
          </Space>

            {connectionStatus && (
              <span className={`text-sm ${connectionStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {connectionStatus === 'success' ? t('settings:tldw.connection.success', 'Connection successful!') : t('settings:tldw.connection.failed', 'Connection failed. Please check your settings.')}
              </span>
            )}
            {connectionDetail && connectionStatus !== 'success' && (
              <span className="text-xs text-gray-500">{connectionDetail}</span>
            )}
            {connectionStatus === 'success' && (
              <div className="ml-4">
                <span className="text-sm mr-2">{t('settings:onboarding.rag.label', 'RAG:')}</span>
                {ragStatus === 'healthy' ? (
                  <Tag color="green">{t('settings:healthPage.healthy', 'Healthy')}</Tag>
                ) : ragStatus === 'unhealthy' ? (
                  <Tag color="red">{t('settings:healthPage.unhealthy', 'Unhealthy')}</Tag>
                ) : (
                  <Tag>{t('settings:healthPage.unknown', 'Unknown')}</Tag>
                )}
              </div>
            )}
          </Space>
        </Form>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">{t('settings:tldw.about.title', 'About tldw_server Integration')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings:tldw.about.description', 'This extension connects to your tldw_server instance, providing access to:')}
          </p>
          <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li>{t('settings:tldw.about.points.providers', 'Multiple LLM providers through a unified API')}</li>
            <li>{t('settings:tldw.about.points.rag', 'RAG (Retrieval-Augmented Generation) search')}</li>
            <li>{t('settings:tldw.about.points.media', 'Media ingestion and processing')}</li>
            <li>{t('settings:tldw.about.points.notes', 'Notes and prompts management')}</li>
            <li>{t('settings:tldw.about.points.stt', 'Speech-to-text transcription')}</li>
          </ul>
        </div>
      </div>
    </Spin>
  )
}
