import React from 'react'
import { Alert, Button, Form, Input, Segmented, Space, Spin, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { tldwClient, TldwConfig } from '@/services/tldw/TldwApiClient'
import { tldwAuth } from '@/services/tldw/TldwAuth'

type Props = {
  onFinish?: () => void
}

export const OnboardingWizard: React.FC<Props> = ({ onFinish }) => {
  const { t } = useTranslation(['settings', 'common'])
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [serverUrl, setServerUrl] = React.useState('')
  const [authMode, setAuthMode] = React.useState<'single-user'|'multi-user'>('single-user')
  const [apiKey, setApiKey] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [connected, setConnected] = React.useState<boolean|null>(null)
  const [ragHealthy, setRagHealthy] = React.useState<'unknown'|'healthy'|'unhealthy'>('unknown')
  const [errorDetail, setErrorDetail] = React.useState<string>('')

  React.useEffect(() => {
    (async () => {
      try {
        const cfg = await tldwClient.getConfig()
        if (cfg?.serverUrl) setServerUrl(cfg.serverUrl)
        if ((cfg as any)?.authMode) setAuthMode((cfg as any).authMode)
      } catch {}
    })()
  }, [])

  const savePartial = async () => {
    const cfg: Partial<TldwConfig> = { serverUrl, authMode }
    if (authMode === 'single-user') cfg.apiKey = apiKey
    await tldwClient.updateConfig(cfg)
  }

  const doTest = async () => {
    setTesting(true)
    setErrorDetail('')
    setConnected(null)
    try {
      await tldwClient.updateConfig({ serverUrl, authMode, apiKey: authMode==='single-user' ? apiKey : undefined })
      await tldwClient.initialize()
      const ok = await tldwClient.healthCheck()
      setConnected(!!ok)
      try {
        const rag = await tldwClient.ragHealth()
        setRagHealthy('healthy')
      } catch {
        setRagHealthy('unhealthy')
      }
    } catch (e: any) {
      setConnected(false)
      const msg = e?.message || 'Connection failed. Please check your server URL and credentials.'
      setErrorDetail(msg)
    } finally {
      setTesting(false)
    }
  }

  const next = async () => {
    if (step === 1) {
      await savePartial()
      setStep(2)
    } else if (step === 2) {
      setLoading(true)
      try {
        if (authMode === 'multi-user' && username && password) {
          await tldwAuth.login({ username, password })
        }
        await doTest()
        setStep(3)
      } catch (e: any) {
        setErrorDetail(e?.message || 'Login failed')
      } finally {
        setLoading(false)
      }
    }
  }

  const finish = async () => {
    try {
      await savePartial()
    } catch {}
    onFinish?.()
  }

  return (
    <div className="max-w-2xl mx-auto my-6 p-4 rounded border dark:border-gray-600 bg-white dark:bg-[#171717]">
      <h2 className="text-lg font-semibold mb-2">{t('settings:onboarding.title')}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings:onboarding.description')}</p>

      {step === 1 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">{t('settings:onboarding.serverUrl.label')}</label>
          <Input placeholder={t('settings:onboarding.serverUrl.placeholder')} value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
          <div className="text-xs text-gray-500">{t('settings:onboarding.serverUrl.help')}</div>
          <div className="flex justify-end mt-2">
            <Button type="primary" disabled={!serverUrl} onClick={next}>{t('settings:onboarding.buttons.next')}</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings:onboarding.authMode.label')}</label>
            <Segmented
              options={[{ label: t('settings:onboarding.authMode.single'), value: 'single-user' }, { label: t('settings:onboarding.authMode.multi'), value: 'multi-user' }]}
              value={authMode}
              onChange={(v) => setAuthMode(v as any)}
            />
          </div>
          {authMode === 'single-user' ? (
            <div>
              <label className="block text-sm font-medium">{t('settings:onboarding.apiKey.label')}</label>
              <Input.Password placeholder={t('settings:onboarding.apiKey.placeholder')} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">{t('settings:onboarding.username.label')}</label>
                <Input placeholder={t('settings:onboarding.username.placeholder')} value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">{t('settings:onboarding.password.label')}</label>
                <Input.Password placeholder={t('settings:onboarding.password.placeholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button onClick={() => setStep(1)}>{t('settings:onboarding.buttons.back')}</Button>
            <Button type="primary" onClick={next} loading={loading}>{t('settings:onboarding.buttons.continue')}</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('settings:onboarding.connection.label')}</span>
            {connected === null ? (
              <Tag>{t('settings:onboarding.connection.unknown')}</Tag>
            ) : connected ? (
              <Tag color="green">{t('settings:onboarding.connection.connected')}</Tag>
            ) : (
              <Tag color="red">{t('settings:onboarding.connection.failed')}</Tag>
            )}
            <Button size="small" onClick={doTest} loading={testing}>{t('settings:onboarding.buttons.recheck')}</Button>
          </div>
          {typeof ragHealthy !== 'undefined' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('settings:onboarding.rag.label')}</span>
              {ragHealthy === 'healthy' ? <Tag color="green">{t('settings:onboarding.rag.healthy')}</Tag> : ragHealthy === 'unhealthy' ? <Tag color="red">{t('settings:onboarding.rag.unhealthy')}</Tag> : <Tag>{t('settings:onboarding.rag.unknown')}</Tag>}
            </div>
          )}
          {errorDetail && (
            <Alert type="error" showIcon message={t('settings:onboarding.connectionFailed')} description={errorDetail} />
          )}
          <div className="flex justify-end">
            <Space>
              <Button onClick={finish}>{t('settings:onboarding.buttons.skip')}</Button>
              <Button type="primary" onClick={finish} disabled={!connected}>{t('settings:onboarding.buttons.finish')}</Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  )
}

export default OnboardingWizard
