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
  const [pathChoice, setPathChoice] = React.useState<'has-server' | 'no-server' | 'demo'>(
    'has-server'
  )
  const [autoFinishOnSuccess, setAutoFinishOnSuccess] = useStorage(
    { key: 'onboardingAutoFinish', instance: new Storage({ area: 'local' }) },
    false
  )

  const { uxState, configStep } = useConnectionUxState()
  const connectionState = useConnectionState()

  React.useEffect(() => {
    try {
      useConnectionStore.getState().beginOnboarding()
    } catch (err) {
      // Store init failures should not block the wizard, but log for diagnostics.
      // eslint-disable-next-line no-console
      console.debug(
        "[OnboardingWizard] Failed to begin onboarding from connection store",
        err
      )
    }
    ;(async () => {
      try {
        const cfg = await tldwClient.getConfig()
        if (cfg?.serverUrl) {
          setServerUrl(cfg.serverUrl)
        }
        if (cfg?.authMode) {
          setAuthMode(cfg.authMode)
        }
        if (cfg?.apiKey) {
          setApiKey(cfg.apiKey)
        }
        // If no configured URL yet, prefill with default/fallback to reduce friction
        if (!cfg?.serverUrl) {
          try {
            const fallback = await getTldwServerURL()
            if (fallback) setServerUrl(fallback)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.debug(
              "[OnboardingWizard] Failed to derive fallback server URL",
              err
            )
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.debug(
          "[OnboardingWizard] Failed to load initial tldw config",
          err
        )
      }
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
    // Basic format validation errors always take precedence.
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

    const trimmed = serverUrl.trim()
    // If the current URL matches the connection config and we are actively
    // checking, surface a "checking" hint.
    if (
      trimmed &&
      connectionState.serverUrl &&
      trimmed === connectionState.serverUrl &&
      connectionState.isChecking
    ) {
      return {
        valid: true as const,
        tone: 'neutral' as const,
        message: t(
          'settings:onboarding.serverUrl.checking',
          'Checking reachability…'
        )
      }
    }

    // If the connection store reports a reachable/connected state for this URL,
    // show the positive success hint that UX tests look for.
    if (
      trimmed &&
      connectionState.serverUrl &&
      trimmed === connectionState.serverUrl &&
      (uxState === 'connected_ok' || uxState === 'connected_degraded')
    ) {
      return {
        valid: true as const,
        tone: 'success' as const,
        message: t(
          'settings:onboarding.serverUrl.reachable',
          'Server responded successfully. You can continue.'
        )
      }
    }

    // If the server URL matches and we are in an unreachable error state,
    // show explicit unreachable copy.
    if (
      trimmed &&
      connectionState.serverUrl &&
      trimmed === connectionState.serverUrl &&
      uxState === 'error_unreachable'
    ) {
      return {
        valid: true as const,
        tone: 'error' as const,
        message: t(
          'settings:onboarding.serverUrl.unreachable',
          'We couldn’t reach this address yet. Double-check the URL or try again.'
        )
      }
    }

    const tone: 'neutral' | 'success' | 'error' = 'neutral'
    const message = t(
      'settings:onboarding.serverUrl.ready',
      'Enter your tldw server URL, then click Next to test your connection.'
    )

    return { valid: true as const, tone, message }
  }, [urlState, t, serverUrl, connectionState.serverUrl, connectionState.isChecking, uxState])

  React.useEffect(() => {
    const trimmed = serverUrl.trim()
    if (!urlState.valid || !trimmed) return
    // Keep the connection store config/server URL in sync with the field so
    // health checks (and success copy) can update while staying on Step 1.
    try {
      void useConnectionStore.getState().setServerUrl(trimmed)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug(
        "[OnboardingWizard] Failed to sync serverUrl into connection store",
        err
      )
    }
  }, [serverUrl, urlState.valid])

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

  const totalSteps = 4

  const visualSteps = React.useMemo(
    () => [
      {
        index: 1,
        label: t(
          "settings:onboarding.stepLabel.welcome",
          "Welcome"
        )
      },
      {
        index: 2,
        label: t(
          "settings:onboarding.stepLabel.url",
          "Connect to your tldw server"
        )
      },
      {
        index: 3,
        label: t(
          "settings:onboarding.stepLabel.auth",
          "Choose how you sign in"
        )
      },
      {
        index: 4,
        label: t(
          "settings:onboarding.stepLabel.health",
          "Confirm connection & Knowledge"
        )
      }
    ],
    [t]
  )

  const displayStep = React.useMemo(() => {
    // Map the three internal config steps (URL/Auth/Health) onto steps 2–4.
    if (activeStep === 1) return 2
    if (activeStep === 2) return 3
    if (activeStep === 3) return 4
    return 2
  }, [activeStep])

  const stepTitle = React.useMemo(() => {
    if (activeStep === 1) {
      return t(
        "settings:onboarding.stepLabel.url",
        "Tell the extension where your server is"
      )
    }
    if (activeStep === 2) {
      return t(
        "settings:onboarding.stepLabel.auth",
        "Set up authentication"
      )
    }
    return t(
      "settings:onboarding.stepLabel.health",
      "Check connection and Knowledge"
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
        // Keep this aligned with the tldw_server README / docs.
        // If the server package or app path changes, update this
        // command string to match the recommended local dev command.
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug(
        "[OnboardingWizard] Failed to persist serverUrl via setConfigPartial",
        err
      )
    } finally {
      setLoading(false)
    }
  }

  const handleBackToUrl = () => {
    try {
      useConnectionStore.getState().beginOnboarding()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug(
        "[OnboardingWizard] Failed to reset onboarding step to URL",
        err
      )
    }
  }

  const handleContinueFromAuth = async () => {
    setAuthError(null)
    if (authMode === 'multi-user' && (!username || !password)) {
      setAuthError(
        t(
          'settings:onboarding.auth.missingCredentials',
          'Enter both a username and password to continue.'
        ) as string
      )
      return
    }
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug(
        "[OnboardingWizard] Failed to persist auth config or run connection test",
        err
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRecheck = async () => {
    await useConnectionStore.getState().testConnectionFromOnboarding()
  }

  const handleUseDemoMode = () => {
    try {
      useConnectionStore.getState().setDemoMode()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug(
        "[OnboardingWizard] Failed to enable demo mode from onboarding",
        err
      )
    }
    onFinish?.()
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

      <div className="mb-4 space-y-2">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {t(
            'settings:onboarding.path.heading',
            'How would you like to get started?'
          )}
        </div>
        <Segmented
          size="small"
          value={pathChoice}
          onChange={(value) => setPathChoice(value as any)}
          options={[
            {
              label: t(
                'settings:onboarding.path.hasServer',
                'I already run tldw_server'
              ),
              value: 'has-server'
            },
            {
              label: t(
                'settings:onboarding.path.noServer',
                "I don’t have a server yet"
              ),
              value: 'no-server'
            },
            {
              label: t(
                'settings:onboarding.path.demo',
                'Just explore with a local demo'
              ),
              value: 'demo'
            }
          ]}
          className="w-full"
        />
        {pathChoice === 'no-server' && (
          <Alert
            className="mt-2 text-xs"
            type="info"
            showIcon
            message={t(
              'settings:onboarding.path.noServerTitle',
              'No server yet? You can still explore.'
            )}
            description={
              <span className="inline-flex flex-col gap-2">
                <span>
                  {t(
                    'settings:onboarding.path.noServerBody',
                    'tldw_server is a separate, self-hosted app. You can follow the setup guide now, or come back later and continue in demo mode.'
                  )}
                </span>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    onClick={() => {
                      try {
                        const docsUrl =
                          t(
                            'settings:onboarding.serverDocsUrl',
                            'https://github.com/rmusser01/tldw_browser_assistant'
                          ) ||
                          'https://github.com/rmusser01/tldw_browser_assistant'
                        window.open(
                          docsUrl,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      } catch {
                        // ignore navigation errors
                      }
                    }}
                  >
                    {t(
                        'settings:onboarding.path.openSetupGuide',
                        'Open setup guide'
                    )}
                  </Button>
                  <Button
                    size="small"
                    onClick={handleUseDemoMode}
                  >
                    {t(
                      'settings:onboarding.path.useDemoFromNoServer',
                      'Use local demo mode'
                    )}
                  </Button>
                </span>
              </span>
            }
          />
        )}
        {pathChoice === 'demo' && (
          <Alert
            className="mt-2 text-xs"
            type="info"
            showIcon
            message={t(
              'settings:onboarding.path.demoTitle',
              'Explore the extension in demo mode'
            )}
            description={
              <span className="inline-flex flex-col gap-2">
                <span>
                  {t(
                    'settings:onboarding.path.demoBody',
                    'Demo mode lets you try chat, notes, and media with sample data. Server-dependent features like Knowledge search will stay limited until you connect your own tldw_server.'
                  )}
                </span>
                <span>
                  <Button
                    size="small"
                    type="primary"
                    onClick={handleUseDemoMode}
                  >
                    {t(
                      'settings:onboarding.path.demoCta',
                      'Use local demo mode'
                    )}
                  </Button>
                </span>
              </span>
            }
          />
        )}
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          {t('settings:onboarding.progress', 'Step {{current}} of {{total}}', {
            current: displayStep,
            total: totalSteps
          })}
        </span>
        <span className="text-right">{stepTitle}</span>
      </div>
      <nav
        aria-label={t(
          "settings:onboarding.progressAria",
          "Onboarding progress"
        )}
        className="mb-4"
      >
        <ol className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          {visualSteps.map((step) => (
            <li
              key={step.index}
              aria-current={step.index === displayStep ? "step" : undefined}
              className={`inline-flex items-center gap-1 ${
                step.index === displayStep
                  ? "font-semibold text-blue-600 dark:text-blue-400"
                  : ""
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                  step.index <= displayStep
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-[#111] dark:text-gray-300"
                }`}
              >
                {step.index}
              </span>
              <span>{step.label}</span>
              {step.index < visualSteps.length && (
                <span className="mx-1 text-gray-400">›</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

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
            role="status"
            aria-live="polite"
            aria-atomic="true"
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
                    t('settings:onboarding.serverDocsUrl', 'https://github.com/rmusser01/tldw_browser_assistant') ||
                    'https://github.com/rmusser01/tldw_browser_assistant'
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
              options={[
                {
                  label: t('settings:onboarding.authMode.single'),
                  value: 'single-user'
                },
                {
                  label: t('settings:onboarding.authMode.multi'),
                  value: 'multi-user'
                }
              ]}
              value={authMode}
              onChange={(v) => setAuthMode(v as any)}
            />
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {t(
                'settings:onboarding.authModeHelp',
                'Single User (API Key) is recommended for personal or small-team servers. Multi User (Login) is for shared deployments where people sign in with usernames or SSO. Choose the mode that matches how your tldw_server is set up.'
              )}
            </p>
          </div>
          {authMode === 'single-user' ? (
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings:onboarding.apiKey.label')}</label>
              <Input.Password placeholder={t('settings:onboarding.apiKey.placeholder')} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {t(
                  'settings:onboarding.apiKeyHelp',
                  'Find your API key in tldw_server → Settings → API Keys. Generate a key there and paste it here.'
                )}
              </p>
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
              description={
                <span className="inline-flex flex-col gap-1 text-xs">
                  <span>{connectionErrorDescription}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t(
                      'settings:onboarding.connection.continueAnyway',
                      'You can finish setup now and explore the UI without a server. Chat, media ingest, and Knowledge search will remain limited until you connect a tldw server from Settings → tldw Server.'
                    )}
                  </span>
                </span>
              }
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
