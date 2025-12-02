import React from 'react'
import { Alert, Button, Input, Segmented, Space, Tag, Checkbox } from 'antd'
import { useStorage } from '@plasmohq/storage/hook'
import { Storage } from '@plasmohq/storage'
import { useTranslation } from 'react-i18next'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { getTldwServerURL, DEFAULT_TLDW_API_KEY } from '@/services/tldw-server'
import { tldwAuth } from '@/services/tldw/TldwAuth'
import { mapMultiUserLoginErrorMessage } from '@/services/auth-errors'
import {
  useConnectionState,
  useConnectionUxState
} from '@/hooks/useConnectionState'
import { useConnectionStore } from '@/store/connection'
import { ConnectionPhase } from '@/types/connection'

type Props = {
  onFinish?: () => void
}

export const OnboardingWizard: React.FC<Props> = ({ onFinish }) => {
  const { t } = useTranslation(['settings', 'common'])
  const [loading, setLoading] = React.useState(false)
  const [serverUrl, setServerUrl] = React.useState('')
  const [serverTouched, setServerTouched] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<'single-user'|'multi-user'>('single-user')
  const [apiKey, setApiKey] = React.useState(DEFAULT_TLDW_API_KEY)
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [autoFinishOnSuccess, setAutoFinishOnSuccess] = useStorage(
    { key: 'onboardingAutoFinish', instance: new Storage({ area: 'local' }) },
    true
  )

  const { uxState, configStep } = useConnectionUxState()
  const connectionState = useConnectionState()

  React.useEffect(() => {
    try {
      useConnectionStore.getState().beginOnboarding()
    } catch {
      // ignore store init errors; Onboarding will still read existing state
    }
    (async () => {
      try {
        const cfg = await tldwClient.getConfig()
        if (cfg?.serverUrl) {
          setServerUrl(cfg.serverUrl)
          setServerTouched(true)
        }
        if ((cfg as any)?.authMode) setAuthMode((cfg as any).authMode)
        if ((cfg as any)?.apiKey) setApiKey((cfg as any).apiKey)
        // If no configured URL yet, prefill with default/fallback to reduce friction
        if (!cfg?.serverUrl) {
          try {
            const fallback = await getTldwServerURL()
            if (fallback) {
              setServerUrl(fallback)
              // Treat a detected fallback URL as an active candidate so we
              // proactively run reachability checks and enable Next once the
              // server responds, without requiring a manual edit first.
              setServerTouched(true)
            }
          } catch {}
        }
      } catch {}
    })()
  }, [])

  const urlState = React.useMemo(() => {
    const trimmed = serverUrl.trim()
    if (!trimmed) {
      return { valid: false, reason: 'empty' as const }
    }
    try {
      const parsed = new URL(trimmed)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, reason: 'protocol' as const }
      }
      return { valid: true, reason: 'ok' as const }
    } catch {
      return { valid: false, reason: 'invalid' as const }
    }
  }, [serverUrl])

  const activeStep = React.useMemo(() => {
    if (configStep === 'url') return 1
    if (configStep === 'auth') return 2
    if (configStep === 'health') return 3

    if (uxState === 'configuring_url' || uxState === 'unconfigured') return 1
    if (uxState === 'configuring_auth') return 2
    if (
      uxState === 'testing' ||
      uxState === 'connected_ok' ||
      uxState === 'connected_degraded' ||
      uxState === 'error_auth' ||
      uxState === 'error_unreachable'
    ) {
      return 3
    }
    return 1
  }, [configStep, uxState])

  const serverHint = React.useMemo(() => {
    if (!urlState.valid) {
      const tone = urlState.reason === 'empty' ? 'neutral' : 'error'
      const message = urlState.reason === 'empty'
        ? t(
            'settings:onboarding.serverUrl.emptyHint',
            'Enter your tldw server URL to enable Next.'
          )
        : urlState.reason === 'protocol'
        ? t(
            'settings:onboarding.serverUrl.invalidProtocol',
            'Use http or https URLs, for example http://127.0.0.1:8000.'
          )
        : t(
            'settings:onboarding.serverUrl.invalid',
            'Enter a full URL such as http://127.0.0.1:8000.'
          )
      return { valid: false as const, tone, message }
    }

    const tone: 'neutral' | 'success' | 'error' = 'neutral'
    const message = t(
      'settings:onboarding.serverUrl.ready',
      'Enter your tldw server URL, then click Next to test your connection.'
    )

    return { valid: true as const, tone, message }
  }, [urlState, t])

  const connectionStatusTag = React.useMemo(() => {
    if (uxState === 'connected_ok' || uxState === 'connected_degraded') {
      return {
        color: 'green' as const,
        label: t('settings:onboarding.connection.connected')
      }
    }
    if (uxState === 'error_auth' || uxState === 'error_unreachable') {
      return {
        color: 'red' as const,
        label: t('settings:onboarding.connection.failed')
      }
    }
    return {
      color: undefined,
      label: t('settings:onboarding.connection.unknown')
    }
  }, [uxState, t])

  type RagStatus = 'healthy' | 'unhealthy' | 'unknown'

  const ragStatus: RagStatus = React.useMemo(() => {
    const status = connectionState.knowledgeStatus
    if (status === 'ready' || status === 'indexing' || status === 'empty') {
      return 'healthy'
    }
    if (status === 'offline') {
      return 'unhealthy'
    }
    return 'unknown'
  }, [connectionState.knowledgeStatus])

  const connectionErrorDescription = React.useMemo(() => {
    if (uxState === 'error_unreachable') {
      return t(
        'settings:onboarding.errors.serverUnreachable',
        'Server not reachable. Check that your tldw_server is running and that your browser can reach it, then try again.'
      )
    }
    if (uxState === 'error_auth') {
      return t(
        'settings:onboarding.connectionFailedDetailed',
        'Connection failed. Please check your server URL and credentials.'
      )
    }
    return null
  }, [uxState, t])

  const totalSteps = 3

  const stepTitle = React.useMemo(() => {
    if (activeStep === 1) {
      return t(
        'settings:onboarding.stepLabel.url',
        'Tell the extension where your server is'
      )
    }
    if (activeStep === 2) {
      return t(
        'settings:onboarding.stepLabel.auth',
        'Set up authentication'
      )
    }
    return t(
      'settings:onboarding.stepLabel.health',
      'Check connection and Knowledge'
    )
  }, [activeStep, t])

  const startCommands = React.useMemo(
    () => [
      {
        key: 'uvicorn',
        label: t(
          'settings:onboarding.startServer.optionLocal',
          'Run locally with Python'
        ),
        command:
          'python -m uvicorn tldw_Server_API.app.main:app --reload',
        hint: t(
          'settings:onboarding.startServer.optionLocalHint',
          'Run inside your tldw_server virtualenv from the server repository root.'
        )
      },
      {
        key: 'docker',
        label: t(
          'settings:onboarding.startServer.optionDocker',
          'Run with Docker Compose (single-user)'
        ),
        command:
          'docker compose -f Dockerfiles/docker-compose.yml up -d --build',
        hint: t(
          'settings:onboarding.startServer.optionDockerHint',
          'Run from the tldw_server repository root to start the API and database.'
        )
      }
    ],
    [t]
  )

  const handleNextFromUrl = async () => {
    setServerTouched(true)
    if (!urlState.valid) {
      return
    }
    setLoading(true)
    try {
      await useConnectionStore.getState().setConfigPartial({ serverUrl })
    } finally {
      setLoading(false)
    }
  }

  const handleBackToUrl = () => {
    ;(useConnectionStore as any).setState((prev: any) => ({
      state: {
        ...prev.state,
        phase: ConnectionPhase.UNCONFIGURED,
        configStep: "url"
      }
    }))
  }

  const handleContinueFromAuth = async () => {
    setAuthError(null)
    setLoading(true)
    try {
      if (authMode === 'multi-user' && username && password) {
        try {
          await tldwAuth.login({ username, password })
        } catch (error: any) {
          const friendly = mapMultiUserLoginErrorMessage(
            t,
            error,
            'onboarding'
          )
          setAuthError(friendly)
          return
        }
      }

      await useConnectionStore.getState().setConfigPartial({
        authMode,
        apiKey: authMode === 'single-user' ? apiKey : undefined
      })
      await useConnectionStore.getState().testConnectionFromOnboarding()
    } finally {
      setLoading(false)
    }
  }

  const handleRecheck = async () => {
    await useConnectionStore.getState().testConnectionFromOnboarding()
  }

  const finish = React.useCallback(() => {
    useConnectionStore.getState().markFirstRunComplete()
    onFinish?.()
  }, [onFinish])

  const autoFinishRef = React.useRef(false)
  React.useEffect(() => {
    if (!autoFinishOnSuccess) return
    if (autoFinishRef.current) return
    if (activeStep !== 3) return

    const connectionHealthy =
      uxState === 'connected_ok' || uxState === 'connected_degraded'
    const ragHealthy =
      connectionState.knowledgeStatus === 'ready' ||
      connectionState.knowledgeStatus === 'indexing' ||
      connectionState.knowledgeStatus === 'empty'

    if (connectionHealthy && ragHealthy) {
      autoFinishRef.current = true
      finish()
    }
  }, [
    activeStep,
    autoFinishOnSuccess,
    connectionState.knowledgeStatus,
    finish,
    uxState
  ])

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white px-6 py-6 text-gray-900 shadow-sm dark:border-gray-700 dark:bg-[#171717] dark:text-gray-100">
      <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('settings:onboarding.title')}</h2>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{t('settings:onboarding.description')}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        {t(
          'settings:onboarding.exploreWithoutServer',
          'You can explore the UI without a server; some features (chat, media ingest, Knowledge search) will stay disabled until you connect.'
        )}
      </p>

      <div className="mb-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          {t('settings:onboarding.progress', 'Step {{current}} of {{total}}', {
            current: activeStep,
            total: totalSteps
          })}
        </span>
        <span className="text-right">{stepTitle}</span>
      </div>

      {activeStep === 1 && (
        <div className="space-y-3">
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-[#1d1d1d] dark:text-gray-200">
            <div className="font-medium text-sm mb-1">
              {t(
                'settings:onboarding.startServer.title',
                'Step 0 — Start your tldw server'
              )}
            </div>
            <p className="mb-2">
              {t(
                'settings:onboarding.startServer.body',
                'If you have not started your server yet, run one of these commands in the tldw_server repository, then return here.'
              )}
            </p>
            <div className="space-y-2">
              {startCommands.map((cmd) => (
                <div
                  key={cmd.key}
                  className="rounded border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-[#121212]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium">
                      {cmd.label}
                    </span>
                    <Button
                      size="small"
                      onClick={() => {
                        try {
                          void navigator.clipboard.writeText(cmd.command)
                        } catch {
                          // ignore clipboard errors
                        }
                      }}
                    >
                      {t(
                        'settings:onboarding.startServer.copy',
                        'Copy command'
                      )}
                    </Button>
                  </div>
                  <pre className="mt-1 rounded bg-gray-900 px-2 py-1 text-[11px] text-gray-100 overflow-x-auto">
                    <code>{cmd.command}</code>
                  </pre>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {cmd.hint}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <label
            htmlFor="onboarding-server-url"
            className="block text-sm font-medium text-gray-800 dark:text-gray-100"
          >
            {t('settings:onboarding.serverUrl.label')}
          </label>
          <Input
            id="onboarding-server-url"
            placeholder={t('settings:onboarding.serverUrl.placeholder')}
            value={serverUrl}
            onChange={(e) => {
              if (!serverTouched) setServerTouched(true)
              setServerUrl(e.target.value)
            }}
            onBlur={() => setServerTouched(true)}
            status={serverHint.tone === 'error' && serverTouched ? 'error' : ''}
          />
          <div
            className={
              'text-xs ' +
              (serverHint.tone === 'error'
                ? 'text-red-500'
                : serverHint.tone === 'success'
                ? 'text-emerald-600'
                : 'text-gray-500')
            }
          >
            <span className="inline-flex items-center gap-2">
              {serverHint.message}
            </span>
          </div>
          <div className="text-xs text-gray-500">{t('settings:onboarding.serverUrl.help')}</div>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            <button
              type="button"
              className="underline text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => {
                try {
                  const docsUrl =
                    t('settings:onboarding.serverDocsUrl', 'https://docs.tldw.app/extension/server-setup') ||
                    'https://docs.tldw.app/extension/server-setup'
                  window.open(docsUrl, '_blank', 'noopener,noreferrer')
                } catch {
                  // ignore navigation errors
                }
              }}>
              {t(
                'settings:onboarding.serverDocsCta',
                'Learn how tldw server works'
              )}
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <Button
              type="primary"
              disabled={!urlState.valid || loading}
              onClick={handleNextFromUrl}
            >
              {t('settings:onboarding.buttons.next')}
            </Button>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">{t('settings:onboarding.authMode.label')}</label>
            <Segmented
              options={[{ label: t('settings:onboarding.authMode.single'), value: 'single-user' }, { label: t('settings:onboarding.authMode.multi'), value: 'multi-user' }]}
              value={authMode}
              onChange={(v) => setAuthMode(v as any)}
            />
          </div>
          {authMode === 'single-user' ? (
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings:onboarding.apiKey.label')}</label>
              <Input.Password placeholder={t('settings:onboarding.apiKey.placeholder')} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings:onboarding.username.label')}</label>
                <Input placeholder={t('settings:onboarding.username.placeholder')} value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings:onboarding.password.label')}</label>
              <Input.Password placeholder={t('settings:onboarding.password.placeholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}
          {authError && (
            <Alert
              className="mt-2"
              type="error"
              showIcon
              message={t('settings:onboarding.connectionFailed')}
              description={
                <span className="inline-flex flex-col gap-1 text-xs">{authError}</span>
              }
            />
          )}
          <div>
            <Checkbox
              checked={autoFinishOnSuccess}
              onChange={(e) => setAutoFinishOnSuccess(e.target.checked)}
            >
              {t('settings:onboarding.autoFinish', 'Finish automatically when connection and RAG are healthy')}
            </Checkbox>
          </div>
          <div className="flex justify-between">
            <Button onClick={handleBackToUrl}>{t('settings:onboarding.buttons.back')}</Button>
            <Button
              type="primary"
              onClick={handleContinueFromAuth}
              loading={loading || connectionState.isChecking}
            >
              {t('settings:onboarding.buttons.continue')}
            </Button>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-3">
          <div>
            <Checkbox
              checked={autoFinishOnSuccess}
              onChange={(e) => setAutoFinishOnSuccess(e.target.checked)}
            >
              {t('settings:onboarding.autoFinish', 'Finish automatically when connection and RAG are healthy')}
            </Checkbox>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('settings:onboarding.connection.label')}</span>
            {connectionStatusTag.color ? (
              <Tag color={connectionStatusTag.color}>{connectionStatusTag.label}</Tag>
            ) : (
              <Tag>{connectionStatusTag.label}</Tag>
            )}
            <Button
              size="small"
              onClick={handleRecheck}
              loading={connectionState.isChecking}
            >
              {t('settings:onboarding.buttons.recheck')}
            </Button>
          </div>
          {(uxState === 'error_auth' || uxState === 'error_unreachable') && (
            <Alert
              type="warning"
              showIcon
              message={t('settings:onboarding.connectionFailed')}
              description={t(
                'settings:onboarding.connection.continueAnyway',
                'You can finish setup now and explore the UI without a server. Chat, media ingest, and Knowledge search will remain limited until you connect a tldw server from Settings → tldw Server.'
              )}
            />
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t('settings:onboarding.rag.label')}
              </span>
              {ragStatus === 'healthy' ? (
                <Tag color="green">
                  {t('settings:onboarding.rag.healthy')}
                </Tag>
              ) : ragStatus === 'unhealthy' ? (
                <Tag color="red">
                  {t('settings:onboarding.rag.unhealthy')}
                </Tag>
              ) : (
                <Tag>{t('settings:onboarding.rag.unknown')}</Tag>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t(
                'settings:onboarding.rag.help',
                'Checks whether your server can search your notes, media, and other connected knowledge sources.'
              )}
            </p>
          </div>
          {connectionErrorDescription && (
            <Alert
              type="error"
              showIcon
              message={t('settings:onboarding.connectionFailed')}
              description={connectionErrorDescription}
            />
          )}
          <div className="flex justify-end">
            <Space>
              <Button onClick={finish}>{t('settings:onboarding.buttons.skip')}</Button>
              <Button
                type="primary"
                danger={uxState === 'error_auth' || uxState === 'error_unreachable'}
                onClick={finish}
                disabled={connectionState.isChecking}
                title={
                  uxState === 'error_auth' || uxState === 'error_unreachable'
                    ? t(
                        'settings:onboarding.buttons.finishAnyway',
                        'Finish setup for now — connect later from Settings → tldw Server.'
                      )
                    : t(
                        'settings:onboarding.buttons.finishAndStart',
                        'Done, start using assistant'
                      )
                }
              >
                {uxState === 'error_auth' || uxState === 'error_unreachable'
                  ? t(
                      'settings:onboarding.buttons.finishAnyway',
                      'Finish without connecting'
                    )
                  : t(
                      'settings:onboarding.buttons.finishAndStart',
                      'Done, start using assistant'
                    )}
              </Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  )
}

export default OnboardingWizard
