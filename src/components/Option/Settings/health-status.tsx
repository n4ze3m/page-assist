import { useEffect, useState } from 'react'
import { Tag, Card, Space, Typography, Button, Alert, notification } from 'antd'
import { browser } from 'wxt/browser'
import { Link, useNavigate } from 'react-router-dom'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { apiSend } from '@/services/api-send'
import type { AllowedPath } from '@/services/tldw/openapi-guard'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

type Check = {
  key: string
  label: string
  path: AllowedPath
}

const makeChecks = (t: TFunction): Check[] => [
  { key: 'core', label: t('settings:healthPage.checks.core', 'Core API'), path: '/api/v1/health' },
  { key: 'rag', label: t('settings:healthPage.checks.rag', 'RAG'), path: '/api/v1/rag/health' },
  { key: 'audio', label: t('settings:healthPage.checks.audio', 'Audio'), path: '/api/v1/audio/health' },
  { key: 'embeddings', label: t('settings:healthPage.checks.embeddings', 'Embeddings'), path: '/api/v1/embeddings/health' },
  { key: 'metrics', label: t('settings:healthPage.checks.metrics', 'Metrics Health'), path: '/api/v1/metrics/health' },
  { key: 'chatMetrics', label: t('settings:healthPage.checks.chatMetrics', 'Chat Metrics'), path: '/api/v1/metrics/chat' },
  { key: 'mcp', label: t('settings:healthPage.checks.mcp', 'MCP'), path: '/api/v1/mcp/health' },
]

type Result = { status: 'unknown'|'healthy'|'unhealthy', detail?: any, statusCode?: number, durationMs?: number }

export default function HealthStatus() {
  const { t } = useTranslation(['settings', 'common'])
  const checks = makeChecks(t)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [loading, setLoading] = useState(false)
  const [serverUrl, setServerUrl] = useState<string>('')
  const [coreStatus, setCoreStatus] = useState<'unknown'|'connected'|'failed'>('unknown')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [intervalSec, setIntervalSec] = useState<number>(30)
  const [recentHealthy, setRecentHealthy] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const runSingle = async (c: Check): Promise<boolean> => {
    const t0 = performance.now()
    try {
      const resp = await apiSend({ path: c.path, method: 'GET' })
      const t1 = performance.now()
      setResults(prev => ({ ...prev, [c.key]: { status: resp?.ok ? 'healthy' : 'unhealthy', detail: resp?.data, statusCode: resp?.status, durationMs: Math.round(t1 - t0) } }))
      return !!resp?.ok
    } catch (e) {
      const t1 = performance.now()
      setResults(prev => ({ ...prev, [c.key]: { status: 'unhealthy', durationMs: Math.round(t1 - t0) } }))
      return false
    }
  }

  const runChecks = async (userTriggered: boolean = false) => {
    setLoading(true)
    let allHealthy = true
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
    setLoading(false)
    if (userTriggered && allHealthy) {
      notification.success({
        message: t('settings:tldw.connection.success', 'Server responded successfully. You can continue.'),
        placement: 'bottomRight',
        duration: 2
      })
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
    const id = setInterval(() => { runChecks() }, Math.max(5, intervalSec) * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, intervalSec])

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <div>
          <Typography.Title level={4} className="!mb-0">{t('healthPage.title', 'Health Status')}</Typography.Title>
          <Typography.Paragraph type="secondary" className="!mb-0">{t('healthPage.subtitle', 'Quick overview of subsystem health endpoints exposed by the server.')}</Typography.Paragraph>
        </div>
        <Space>
          <Button onClick={() => navigate(-1)}>← {t('healthPage.backToChat', 'Back to chat')}</Button>
          <Link to="/settings/tldw"><Button>{t('healthPage.openSettings', 'Open tldw Settings')}</Button></Link>
          <Button type="primary" onClick={() => runChecks(true)} loading={loading}>{t('healthPage.recheckAll', 'Recheck All')}</Button>
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
          >{t('healthPage.copyDiagnostics', 'Copy diagnostics')}</Button>
        </Space>
      </div>

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

      <div className="flex items-center gap-4">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> {t('healthPage.autoRefresh', 'Auto-refresh')}
        </label>
        <label className="text-sm flex items-center gap-2">
          {t('healthPage.intervalLabel', 'Interval (s):')}
          <input type="number" min={5} className="w-20 px-2 py-1 rounded border dark:bg-[#262626]" value={intervalSec} onChange={(e) => setIntervalSec(parseInt(e.target.value || '30'))} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map(c => {
          const r = results[c.key] || { status: 'unknown' }
          return (
            <Card key={c.key} title={c.label} extra={<a onClick={() => recheckOne(c)}>{loading ? t('healthPage.checking', 'Checking…') : t('healthPage.recheck', 'Recheck')}</a>}>
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
                  <Tag>HTTP {r.statusCode}</Tag>
                )}
                {typeof r.durationMs !== 'undefined' && (
                  <Tag>{r.durationMs} ms</Tag>
                )}
              </Space>
              {r.detail && (
                <pre className="mt-3 p-2 bg-gray-50 dark:bg-[#262626] rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(r.detail, null, 2)}
                </pre>
              )}
            </Card>
          )
        })}
      </div>
    </Space>
  )
}
