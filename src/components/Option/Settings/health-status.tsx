import { useEffect, useState } from 'react'
import { Tag, Card, Space, Typography, Button, Alert, Tooltip } from 'antd'
import { browser } from 'wxt/browser'
import { Link, useNavigate } from 'react-router-dom'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { apiSend } from '@/services/api-send'
import type { AllowedPath } from '@/services/tldw/openapi-guard'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAntdNotification } from '@/hooks/useAntdNotification'
import { getReturnTo, clearReturnTo } from "@/utils/return-to"
import { ServerOverviewHint } from "@/components/Common/ServerOverviewHint"

type Check = {
  key: string
  label: string
  path: AllowedPath
  descriptionKey: string
  descriptionDefault: string
  docsUrlKey?: string
  docsUrlDefault?: string
}

const makeChecks = (t: TFunction): Check[] => {
  const base = 'settings:healthPage.checks'
  return [
    {
      key: 'core',
      label: t(`${base}.core`, 'Core API'),
      path: '/api/v1/health',
      descriptionKey: `${base}.coreDescription`,
      descriptionDefault:
        'Verifies the main chat API. If this is unhealthy, confirm your server URL, API key, and core logs.',
      docsUrlKey: `${base}.coreDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/core'
    },
    {
      key: 'rag',
      label: t(`${base}.rag`, 'RAG'),
      path: '/api/v1/rag/health',
      descriptionKey: `${base}.ragDescription`,
      descriptionDefault:
        'Powers Knowledge search & retrieval. If this is unhealthy, ensure RAG is enabled and the knowledge index has been built on your server.',
      docsUrlKey: `${base}.ragDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/rag'
    },
    {
      key: 'audio',
      label: t(`${base}.audio`, 'Audio'),
      path: '/api/v1/audio/health',
      descriptionKey: `${base}.audioDescription`,
      descriptionDefault:
        'Covers text-to-speech and speech-to-text APIs. If this is unhealthy, confirm your audio endpoints are enabled and reachable.',
      docsUrlKey: `${base}.audioDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/audio'
    },
    {
      key: 'embeddings',
      label: t(`${base}.embeddings`, 'Embeddings'),
      path: '/api/v1/embeddings/health',
      descriptionKey: `${base}.embeddingsDescription`,
      descriptionDefault:
        'Checks the embeddings and indexing services used for retrieval. If this is unhealthy, rebuild your embedding index or restart the worker.',
      docsUrlKey: `${base}.embeddingsDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/embeddings'
    },
    {
      key: 'metrics',
      label: t(`${base}.metrics`, 'Metrics Health'),
      path: '/api/v1/metrics/health',
      descriptionKey: `${base}.metricsDescription`,
      descriptionDefault:
        'Verifies metrics and monitoring endpoints. If this is unhealthy, metrics dashboards or alerting may be unavailable.',
      docsUrlKey: `${base}.metricsDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/metrics'
    },
    {
      key: 'chatMetrics',
      label: t(`${base}.chatMetrics`, 'Chat Metrics'),
      path: '/api/v1/metrics/chat',
      descriptionKey: `${base}.chatMetricsDescription`,
      descriptionDefault:
        'Tracks chat analytics such as volume and latency. If this is unhealthy, chat metrics collection or endpoints may be failing.',
      docsUrlKey: `${base}.chatMetricsDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/chat-metrics'
    },
    {
      key: 'mcp',
      label: t(`${base}.mcp`, 'MCP'),
      path: '/api/v1/mcp/health',
      descriptionKey: `${base}.mcpDescription`,
      descriptionDefault:
        'Checks Model Context Protocol (MCP) tools. If this is unhealthy, external tools and plugins may not be available in chat.',
      docsUrlKey: `${base}.mcpDocsUrl`,
      docsUrlDefault: 'https://docs.tldw.app/health/mcp'
    }
  ]
}

type Result = { status: 'unknown'|'healthy'|'unhealthy', detail?: any, statusCode?: number, durationMs?: number }

export default function HealthStatus() {
  const { t } = useTranslation(['settings', 'common'])
  const notification = useAntdNotification()
  const checks = makeChecks(t)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [loading, setLoading] = useState(false)
  const [serverUrl, setServerUrl] = useState<string>('')
  const [coreStatus, setCoreStatus] = useState<'unknown'|'connected'|'failed'>('unknown')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [intervalSec, setIntervalSec] = useState<number>(30)
  const [recentHealthy, setRecentHealthy] = useState<Set<string>>(new Set())
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const isRunningRef = useRef(false)
  const navigate = useNavigate()
  const MIN_INTERVAL_SEC = 5
  const SAFE_FLOOR_SEC = 15

  const runSingle = async (c: Check): Promise<boolean> => {
    const t0 = performance.now()
    try {
      const resp = await apiSend({ path: c.path, method: 'GET' })
      const t1 = performance.now()
      const statusCode =
        typeof resp?.status === 'number' && !Number.isNaN(resp.status)
          ? resp.status
          : undefined
      const detail = resp?.ok ? resp?.data : resp?.error || resp?.data
      setResults((prev) => ({
        ...prev,
        [c.key]: {
          status: resp?.ok ? 'healthy' : 'unhealthy',
          detail,
          statusCode,
          durationMs: Math.round(t1 - t0)
        }
      }))
      return !!resp?.ok
    } catch (e) {
      const t1 = performance.now()
      const message = (e as any)?.message || 'Network error'
      setResults((prev) => ({
        ...prev,
        [c.key]: {
          status: 'unhealthy',
          detail: message,
          statusCode: 0,
          durationMs: Math.round(t1 - t0)
        }
      }))
      return false
    }
  }

  const runChecks = async (userTriggered: boolean = false) => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    setLoading(true)
    let allHealthy = true
    try {
      for (const c of checks) {
        // eslint-disable-next-line no-await-in-loop
        const prev = results[c.key]?.status
        const ok = await runSingle(c)
        if (userTriggered && ok && prev !== 'healthy') {
          // Mark as recently turned healthy for a subtle pulse
          setRecentHealthy(prevSet => {
            const next = new Set(prevSet)
            next.add(c.key)
            return next
          })
          setTimeout(() => {
            setRecentHealthy(prevSet => {
              const next = new Set(prevSet)
              next.delete(c.key)
              return next
            })
          }, 1200)
        }
        if (!ok) allHealthy = false
      }
      setLastUpdatedAt(Date.now())
      if (userTriggered && allHealthy) {
        notification.success({
          message: t('settings:tldw.connection.success', 'Server responded successfully. You can continue.'),
          placement: 'bottomRight',
          duration: 2
        })
      }
    } finally {
      setLoading(false)
      isRunningRef.current = false
    }
  }

  const recheckOne = async (c: Check) => {
    const prev = results[c.key]?.status
    const ok = await runSingle(c)
    if (ok && prev !== 'healthy') {
      setRecentHealthy(prevSet => {
        const next = new Set(prevSet)
        next.add(c.key)
        return next
      })
      setTimeout(() => {
        setRecentHealthy(prevSet => {
          const next = new Set(prevSet)
          next.delete(c.key)
          return next
        })
      }, 1200)
      notification.success({
        message: t('settings:tldw.connection.success', 'Server responded successfully. You can continue.'),
        placement: 'bottomRight',
        duration: 2
      })
    }
  }

  const testCoreConnection = async () => {
    try {
      await tldwClient.initialize()
      const ok = await tldwClient.healthCheck()
      setCoreStatus(ok ? 'connected' : 'failed')
    } catch {
      setCoreStatus('failed')
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const cfg = await tldwClient.getConfig()
        setServerUrl(cfg?.serverUrl || '')
      } catch {}
      await testCoreConnection()
      await runChecks()
    })()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      void runChecks()
    }, Math.max(MIN_INTERVAL_SEC, intervalSec) * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, intervalSec])

  useEffect(() => {
    if (!lastUpdatedAt) {
      setSecondsSinceUpdate(null)
      return
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000))
      setSecondsSinceUpdate(diff)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lastUpdatedAt])

  const intervalSecClamped = Math.max(MIN_INTERVAL_SEC, intervalSec)
  const secondsUntilNext =
    autoRefresh && secondsSinceUpdate != null
      ? Math.max(0, intervalSecClamped - secondsSinceUpdate)
      : null
  const showIntervalWarning =
    autoRefresh && intervalSecClamped < SAFE_FLOOR_SEC

  const describeStatus = (status: Result['status']): string => {
    if (status === 'healthy') {
      return t('healthPage.statusHealthy', 'Healthy')
    }
    if (status === 'unhealthy') {
      return t('healthPage.statusUnhealthy', 'Unhealthy')
    }
    return t('healthPage.statusUnknown', 'Unknown')
  }

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <div>
          <Typography.Title level={4} className="!mb-0">
            {t(
              "healthPage.title",
              "Health & diagnostics"
            )}
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="!mb-0">
            {t(
              "healthPage.subtitle",
              "Quick overview of how your tldw server powers chat, Knowledge search, media ingest, and other tools."
            )}
          </Typography.Paragraph>
        </div>
        <Space>
          <Button
            type="primary"
            onClick={() => runChecks(true)}
            loading={loading}
          >
            {t('healthPage.recheckAll', 'Recheck All')}
          </Button>
          <Tooltip title={t('healthPage.copyDiagnosticsHelp', 'Copies JSON diagnostics to clipboard') as string}>
            <Button
              onClick={() => {
                try {
                  const payload = {
                    serverUrl,
                    coreStatus,
                    timestamp: new Date().toISOString(),
                    results
                  }
                  const text = JSON.stringify(payload, null, 2)
                  void navigator.clipboard.writeText(text)
                } catch {}
              }}
            >
              {t('healthPage.copyDiagnostics', 'Copy diagnostics')}
            </Button>
          </Tooltip>
          <Button
            onClick={() => {
              const target = getReturnTo()
              if (target) {
                clearReturnTo()
                navigate(target)
              } else {
                navigate(-1)
              }
            }}>
            ← {t('healthPage.backToChat', 'Back to chat')}
          </Button>
          <Link to="/settings/tldw">
            <Button>{t('healthPage.openSettings', 'Open tldw Settings')}</Button>
          </Link>
        </Space>
      </div>

      {!serverUrl && (
        <Alert
          type="info"
          showIcon
          className="mt-2"
          message={t(
            'healthPage.noServerBannerTitle',
            'Don’t have a server yet?'
          )}
          description={
            <span className="text-sm">
              {t(
                'healthPage.noServerBannerBody',
                'You can explore the UI first, then connect a tldw server later to enable chat history, media ingest, and Knowledge search.'
              )}
            </span>
          }
        />
      )}

      {!serverUrl || coreStatus === 'failed' ? (
        <Alert
          type="warning"
          showIcon
          message={!serverUrl ? t('healthPage.serverNotConfigured', 'Server is not configured.') : t('healthPage.unableToReachCore', 'Unable to reach server core health endpoint.')}
          description={serverUrl ? t('healthPage.triedGet', 'Tried GET {{url}}', { url: `${serverUrl.replace(/\/$/, '')}/api/v1/health` }) : t('healthPage.configureHint', 'Please configure a server URL under tldw settings.')}
          action={<Link to="/settings/tldw"><Button size="small">{t('healthPage.configureCta', 'Configure')}</Button></Link>}
        />
      ) : (
        <Alert type="success" showIcon message={t('healthPage.connectedTo', 'Connected to {{host}}', { host: serverUrl })} />
      )}

      {(!serverUrl || coreStatus === 'failed') && (
        <ServerOverviewHint />
      )}

      <div className="flex items-center gap-4">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> {t('healthPage.autoRefresh', 'Auto-refresh')}
        </label>
        <label className="text-sm flex items-center gap-2">
          {t('healthPage.intervalLabel', 'Interval (s):')}
          <input
            type="number"
            min={MIN_INTERVAL_SEC}
            className="w-20 px-2 py-1 rounded border dark:bg-[#262626]"
            value={intervalSec}
            onChange={(e) =>
              setIntervalSec(parseInt(e.target.value || '30'))
            }
          />
        </label>
        {secondsSinceUpdate != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {secondsSinceUpdate <= 5
              ? t('healthPage.updatedJustNow', 'Updated just now')
              : t('healthPage.updatedSecondsAgo', 'Updated {{seconds}}s ago', { seconds: secondsSinceUpdate })}
          </span>
        )}
        {autoRefresh && secondsUntilNext != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('healthPage.nextRefreshIn', 'Next auto-refresh in {{seconds}}s', {
              seconds: secondsUntilNext
            })}
          </span>
        )}
        {showIntervalWarning && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {t(
              'healthPage.intervalWarning',
              'Short intervals can put load on your server. Consider using at least {{seconds}}s.',
              { seconds: SAFE_FLOOR_SEC }
            )}
          </span>
        )}
      </div>

      <div aria-live="polite" aria-atomic="false">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map(c => {
            const r = results[c.key] || { status: 'unknown' }
            const statusLabel = describeStatus(r.status)
            const description = t(c.descriptionKey, c.descriptionDefault)
            const docsUrl =
              c.docsUrlKey || c.docsUrlDefault
                ? t(c.docsUrlKey || '', c.docsUrlDefault || '')
                : ''
            const isUnhealthy = r.status === 'unhealthy'
            return (
              <Card
                key={c.key}
                title={c.label}
                extra={<a onClick={() => recheckOne(c)}>{loading ? t('healthPage.checking', 'Checking…') : t('healthPage.recheck', 'Recheck')}</a>}
                role="group"
                aria-label={`${c.label}: ${statusLabel}`}
              >
                <Space size="middle" className="flex flex-wrap">
                  {r.status === 'healthy' ? (
                    <Tag color="green" className={recentHealthy.has(c.key) ? 'animate-pulse ring-2 ring-emerald-400' : undefined}>
                      {t('healthPage.healthy', 'Healthy')}
                    </Tag>
                  ) : r.status === 'unhealthy' ? (
                    <Tag color="red">{t('healthPage.unhealthy', 'Unhealthy')}</Tag>
                  ) : (
                    <Tag>{t('healthPage.unknown', 'Unknown')}</Tag>
                  )}
                  <Typography.Text type="secondary">{c.path}</Typography.Text>
                  {typeof r.statusCode !== 'undefined' && (
                    <Tag>
                      {r.statusCode && r.statusCode > 0
                        ? t('healthPage.statusCodeTag', 'HTTP {{code}}', {
                            code: r.statusCode
                          })
                        : t('healthPage.statusCodeNetwork', 'Network/timeout')}
                    </Tag>
                  )}
                  {typeof r.durationMs !== 'undefined' && (
                    <Tag>{r.durationMs} ms</Tag>
                  )}
                </Space>
                {description && (
                  <Typography.Paragraph
                    type="secondary"
                    className="!mt-3 !mb-1 text-xs md:text-sm"
                  >
                    {description}
                  </Typography.Paragraph>
                )}
                {isUnhealthy && docsUrl && (
                  <Typography.Link
                    className="text-xs"
                    onClick={() => {
                      try {
                        browser.tabs.create({ url: docsUrl })
                      } catch {
                        window.open(docsUrl, '_blank')
                      }
                    }}
                  >
                    {t(
                      'healthPage.troubleshootLink',
                      'Troubleshooting tips'
                    )}
                  </Typography.Link>
                )}
                {r.detail && (
                  <>
                    <div className="mt-3 flex items-center justify-between">
                      <Typography.Text
                        type="secondary"
                        className="text-xs">
                        {t(
                          'healthPage.errorDetailsLabel',
                          'Technical details (for advanced users)'
                        )}
                      </Typography.Text>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          try {
                            const payload = {
                              check: c.key,
                              path: c.path,
                              status: r.status,
                              statusCode: r.statusCode,
                              durationMs: r.durationMs,
                              detail: r.detail
                            }
                            const text = JSON.stringify(payload, null, 2)
                            void navigator.clipboard.writeText(text)
                          } catch {}
                        }}>
                        {t('healthPage.copyError', 'Copy error')}
                      </Button>
                    </div>
                    <Typography.Text
                      type="secondary"
                      className="mt-1 block text-[10px] md:text-xs"
                    >
                      {t(
                        'healthPage.rawResponseFrom',
                        'Raw response from {{path}}',
                        { path: c.path }
                      )}
                    </Typography.Text>
                    <pre className="mt-1 p-2 bg-gray-50 dark:bg-[#262626] rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(r.detail, null, 2)}
                    </pre>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </Space>
  )
}
