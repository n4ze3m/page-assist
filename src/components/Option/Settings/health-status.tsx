import { useEffect, useState } from 'react'
import { Tag, Card, Space, Typography, Button, Alert } from 'antd'
import { browser } from 'wxt/browser'
import { Link } from 'react-router-dom'
import { tldwClient } from '@/services/tldw/TldwApiClient'

type Check = {
  key: string
  label: string
  path: string
}

const checks: Check[] = [
  { key: 'core', label: 'Core API', path: '/api/v1/health' },
  { key: 'rag', label: 'RAG', path: '/api/v1/rag/health' },
  { key: 'audio', label: 'Audio', path: '/api/v1/audio/v1/audio/health' },
  { key: 'embeddings', label: 'Embeddings', path: '/api/v1/embeddings/health' },
  { key: 'metrics', label: 'Metrics Health', path: '/api/v1/metrics/health' },
  { key: 'chatMetrics', label: 'Chat Metrics', path: '/api/v1/metrics/chat' },
  { key: 'mcp', label: 'MCP', path: '/api/v1/mcp/health' },
]

type Result = { status: 'unknown'|'healthy'|'unhealthy', detail?: any, statusCode?: number, durationMs?: number }

export default function HealthStatus() {
  const [results, setResults] = useState<Record<string, Result>>({})
  const [loading, setLoading] = useState(false)
  const [serverUrl, setServerUrl] = useState<string>('')
  const [coreStatus, setCoreStatus] = useState<'unknown'|'connected'|'failed'>('unknown')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [intervalSec, setIntervalSec] = useState<number>(30)

  const runSingle = async (c: Check) => {
    const t0 = performance.now()
    try {
      const resp = await browser.runtime.sendMessage({ type: 'tldw:request', payload: { path: c.path, method: 'GET' } })
      const t1 = performance.now()
      setResults(prev => ({ ...prev, [c.key]: { status: resp?.ok ? 'healthy' : 'unhealthy', detail: resp?.data, statusCode: resp?.status, durationMs: Math.round(t1 - t0) } }))
    } catch (e) {
      const t1 = performance.now()
      setResults(prev => ({ ...prev, [c.key]: { status: 'unhealthy', durationMs: Math.round(t1 - t0) } }))
    }
  }

  const runChecks = async () => {
    setLoading(true)
    for (const c of checks) {
      // eslint-disable-next-line no-await-in-loop
      await runSingle(c)
    }
    setLoading(false)
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
          <Typography.Title level={4} className="!mb-0">Health Status</Typography.Title>
          <Typography.Paragraph type="secondary" className="!mb-0">Quick overview of subsystem health endpoints exposed by the server.</Typography.Paragraph>
        </div>
        <Space>
          <Link to="/settings/tldw"><Button>Open tldw Settings</Button></Link>
          <Button type="primary" onClick={runChecks} loading={loading}>Recheck All</Button>
        </Space>
      </div>

      {!serverUrl || coreStatus === 'failed' ? (
        <Alert
          type="warning"
          showIcon
          message={!serverUrl ? 'Server is not configured.' : 'Unable to reach server core health endpoint.'}
          description={serverUrl ? `Tried GET ${serverUrl.replace(/\/$/, '')}/api/v1/health` : 'Please configure a server URL under tldw settings.'}
          action={<Link to="/settings/tldw"><Button size="small">Configure</Button></Link>}
        />
      ) : (
        <Alert type="success" showIcon message={`Connected to ${serverUrl}`} />
      )}

      <div className="flex items-center gap-4">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto-refresh
        </label>
        <label className="text-sm flex items-center gap-2">
          Interval (s):
          <input type="number" min={5} className="w-20 px-2 py-1 rounded border dark:bg-[#262626]" value={intervalSec} onChange={(e) => setIntervalSec(parseInt(e.target.value || '30'))} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map(c => {
          const r = results[c.key] || { status: 'unknown' }
          return (
            <Card key={c.key} title={c.label} extra={<a onClick={() => runSingle(c)}>{loading ? 'Checking…' : 'Recheck'}</a>}>
              <Space size="middle" className="flex flex-wrap">
                {r.status === 'healthy' ? <Tag color="green">Healthy</Tag> : r.status === 'unhealthy' ? <Tag color="red">Unhealthy</Tag> : <Tag>Unknown</Tag>}
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
