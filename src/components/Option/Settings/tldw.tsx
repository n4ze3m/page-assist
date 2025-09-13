import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { Segmented, Space, Input, Alert, Form, message, Spin, Button } from "antd"
import { Link } from "react-router-dom"
import React, { useEffect, useState } from "react"
import { browser } from "wxt/browser"
import { useTranslation } from "react-i18next"
import { tldwClient, TldwConfig } from "@/services/tldw/TldwApiClient"
import { tldwAuth } from "@/services/tldw/TldwAuth"
import { Tag } from "antd"

export const TldwSettings = () => {
  const { t } = useTranslation(["settings", "common"])
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
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

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const config = await tldwClient.getConfig()
      if (config) {
        setAuthMode(config.authMode)
        setServerUrl(config.serverUrl)
        if (typeof (config as any).requestTimeoutMs === 'number') setRequestTimeoutSec(Math.round((config as any).requestTimeoutMs / 1000))
        if (typeof (config as any).streamIdleTimeoutMs === 'number') setStreamIdleTimeoutSec(Math.round((config as any).streamIdleTimeoutMs / 1000))
        if (typeof (config as any).chatRequestTimeoutMs === 'number') setChatRequestTimeoutSec(Math.round((config as any).chatRequestTimeoutMs / 1000))
        if (typeof (config as any).chatStreamIdleTimeoutMs === 'number') setChatStreamIdleTimeoutSec(Math.round((config as any).chatStreamIdleTimeoutMs / 1000))
        if (typeof (config as any).ragRequestTimeoutMs === 'number') setRagRequestTimeoutSec(Math.round((config as any).ragRequestTimeoutMs / 1000))
        if (typeof (config as any).mediaRequestTimeoutMs === 'number') setMediaRequestTimeoutSec(Math.round((config as any).mediaRequestTimeoutMs / 1000))
        if (typeof (config as any).uploadRequestTimeoutMs === 'number') setUploadRequestTimeoutSec(Math.round((config as any).uploadRequestTimeoutMs / 1000))
        form.setFieldsValue({
          serverUrl: config.serverUrl,
          apiKey: config.apiKey,
          authMode: config.authMode
        })
        
        // Check if logged in for multi-user mode
        if (config.authMode === 'multi-user' && config.accessToken) {
          setIsLoggedIn(true)
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
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
    
    try {
      const values = form.getFieldsValue()
      let success = false

      if (values.authMode === 'single-user' && values.apiKey) {
        // Validate against a strictly protected endpoint by provoking a non-auth error (400) vs 401
        // We intentionally use an invalid model id; if auth is valid, server should respond 400/404/422, not 401
        const resp = await browser.runtime.sendMessage({
          type: 'tldw:request',
          payload: {
            path: `${String(values.serverUrl).replace(/\/$/, '')}/api/v1/chat/completions`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': String(values.apiKey).trim() },
            body: { model: '__validation__', messages: [{ role: 'user', content: 'ping' }], stream: false },
            noAuth: true
          }
        })
        // Treat any non-401 as valid auth; 401 means invalid key
        success = resp?.status !== 401 && resp?.status !== 403
        if (!success) {
          message.error(resp?.error || 'API key validation failed')
        }
      } else {
        // Test basic health endpoint via background proxy
        const resp = await browser.runtime.sendMessage({
          type: 'tldw:request',
          payload: {
            path: `${String(values.serverUrl).replace(/\/$/, '')}/api/v1/health`,
            method: 'GET'
          }
        })
        success = !!resp?.ok
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
        message.success("Connection successful!")
        await tldwClient.initialize()
      } else {
        message.error("Connection failed. Please check your settings.")
      }
    } catch (error) {
      setConnectionStatus('error')
      message.error((error as any)?.message || "Connection failed. Please check your server URL and API key.")
      console.error('Connection test failed:', error)
    } finally {
      setTestingConnection(false)
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
      message.success("Login successful!")
      
      // Clear password field
      form.setFieldValue('password', '')
      
      // Test connection after login
      await testConnection()
    } catch (error: any) {
      message.error(error.message || "Login failed")
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
      message.success("Logged out successfully")
    } catch (error) {
      message.error("Logout failed")
      console.error('Logout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Spin spinning={loading}>
      <div className="max-w-2xl">
        <div className="mb-4 p-2 rounded border dark:border-gray-600 bg-white dark:bg-[#171717] flex items-center justify-between">
          <div className="text-sm">
            <span className="mr-2 font-medium">Server:</span>
            <span className="text-gray-600 dark:text-gray-300 break-all">{serverUrl || 'Not configured'}</span>
          </div>
          <Space>
            <Link to="/settings/health">
              <Button>Health</Button>
            </Link>
            <Button type="primary" onClick={testConnection} loading={testingConnection}>Recheck</Button>
          </Space>
        </div>
        <h2 className="text-base font-semibold mb-4">tldw Server Configuration</h2>
        
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Request Timeout (seconds)</label>
              <Input
                type="number"
                min={1}
                value={requestTimeoutSec}
                onChange={(e) => setRequestTimeoutSec(parseInt(e.target.value || '10'))}
                placeholder="10"
              />
              <div className="text-xs text-gray-500 mt-1">Abort initial requests if no response within this time. Default: 10s.</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Streaming Idle Timeout (seconds)</label>
              <Input
                type="number"
                min={1}
                value={streamIdleTimeoutSec}
                onChange={(e) => setStreamIdleTimeoutSec(parseInt(e.target.value || '15'))}
                placeholder="15"
              />
              <div className="text-xs text-gray-500 mt-1">Abort streaming if no updates received within this time. Default: 15s.</div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Per‑API Timeouts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chat Request Timeout (s)</label>
                <Input type="number" min={1} value={chatRequestTimeoutSec} onChange={(e) => setChatRequestTimeoutSec(parseInt(e.target.value||'10'))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chat Stream Idle (s)</label>
                <Input type="number" min={1} value={chatStreamIdleTimeoutSec} onChange={(e) => setChatStreamIdleTimeoutSec(parseInt(e.target.value||'15'))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RAG Request Timeout (s)</label>
                <Input type="number" min={1} value={ragRequestTimeoutSec} onChange={(e) => setRagRequestTimeoutSec(parseInt(e.target.value||'10'))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Media Request Timeout (s)</label>
                <Input type="number" min={1} value={mediaRequestTimeoutSec} onChange={(e) => setMediaRequestTimeoutSec(parseInt(e.target.value||'60'))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Request Timeout (s)</label>
                <Input type="number" min={1} value={uploadRequestTimeoutSec} onChange={(e) => setUploadRequestTimeoutSec(parseInt(e.target.value||'60'))} />
              </div>
            </div>
          </div>

          {authMode === 'single-user' && (
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: 'Please enter your API key' }]}
              extra="Your tldw_server API key for authentication"
            >
              <Input.Password placeholder="Enter your API key" />
            </Form.Item>
          )}

          {authMode === 'multi-user' && !isLoggedIn && (
            <>
              <Alert
                message="Login Required"
                description="Please login with your tldw_server credentials"
                type="info"
                showIcon
                className="mb-4"
              />
              
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please enter your username' }]}
              >
                <Input placeholder="Enter username" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" onClick={handleLogin}>
                  Login
                </Button>
              </Form.Item>
            </>
          )}

          {authMode === 'multi-user' && isLoggedIn && (
            <Alert
              message="Logged In"
              description="You are currently logged in to tldw_server"
              type="success"
              showIcon
              action={
                <Button size="small" danger onClick={handleLogout}>
                  Logout
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
                Test Connection
              </Button>
            </Space>

            {connectionStatus && (
              <span className={`text-sm ${connectionStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {connectionStatus === 'success' ? 'Connected' : 'Connection failed'}
              </span>
            )}
            {connectionStatus === 'success' && (
              <div className="ml-4">
                <span className="text-sm mr-2">RAG:</span>
                {ragStatus === 'healthy' ? (
                  <Tag color="green">Healthy</Tag>
                ) : ragStatus === 'unhealthy' ? (
                  <Tag color="red">Unhealthy</Tag>
                ) : (
                  <Tag>Unknown</Tag>
                )}
              </div>
            )}
          </Space>
        </Form>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">About tldw_server Integration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This extension connects to your tldw_server instance, providing access to:
          </p>
          <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li>Multiple LLM providers through a unified API</li>
            <li>RAG (Retrieval-Augmented Generation) search</li>
            <li>Media ingestion and processing</li>
            <li>Notes and prompts management</li>
            <li>Speech-to-text transcription</li>
          </ul>
        </div>
      </div>
    </Spin>
  )
}
