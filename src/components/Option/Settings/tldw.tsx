import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { Segmented, Space, Input, Alert, Form, message, Spin, Button } from "antd"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { tldwClient, TldwConfig } from "@/services/tldw/TldwApiClient"
import { tldwAuth } from "@/services/tldw/TldwAuth"

export const TldwSettings = () => {
  const { t } = useTranslation(["settings", "common"])
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
  const [authMode, setAuthMode] = useState<'single-user' | 'multi-user'>('single-user')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const config = await tldwClient.getConfig()
      if (config) {
        setAuthMode(config.authMode)
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
      const config: Partial<TldwConfig> = {
        serverUrl: values.serverUrl,
        authMode: values.authMode
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
        success = await tldwAuth.testApiKey(values.serverUrl, values.apiKey)
      } else {
        // Test basic health endpoint
        const response = await fetch(`${values.serverUrl}/api/v1/health`)
        success = response.ok
      }

      setConnectionStatus(success ? 'success' : 'error')
      
      if (success) {
        message.success("Connection successful!")
        // Initialize client after successful test
        await tldwClient.initialize()
      } else {
        message.error("Connection failed. Please check your settings.")
      }
    } catch (error) {
      setConnectionStatus('error')
      message.error("Connection failed. Please check your server URL.")
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
