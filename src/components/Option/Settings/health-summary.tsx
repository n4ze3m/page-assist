import { useEffect, useState } from 'react'
import { Drawer, Button, Tooltip } from 'antd'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { useTranslation } from 'react-i18next'

export default function HealthSummary() {
  const { t } = useTranslation(['settings'])
  const [core, setCore] = useState<'unknown'|'ok'|'fail'>('unknown')
  const [rag, setRag] = useState<'unknown'|'ok'|'fail'>('unknown')

  const [coreCheckedAt, setCoreCheckedAt] = useState<number|null>(null)
  const [ragCheckedAt, setRagCheckedAt] = useState<number|null>(null)
  const [open, setOpen] = useState(false)
  const diagnosticsPanelId = 'health-diagnostics-panel'

  useEffect(() => {
    (async () => {
      try {
        await tldwClient.initialize()
        const ok = await tldwClient.healthCheck()
        setCore(ok ? 'ok' : 'fail')
        setCoreCheckedAt(Date.now())
      } catch { setCore('fail'); setCoreCheckedAt(Date.now()) }
      try {
        await tldwClient.ragHealth()
        setRag('ok'); setRagCheckedAt(Date.now())
      } catch { setRag('fail'); setRagCheckedAt(Date.now()) }
    })()
  }, [])

  const Dot = ({ status }: { status: 'unknown'|'ok'|'fail' }) => (
    <span
      aria-hidden
      className={`inline-block w-2 h-2 rounded-full ${status==='ok' ? 'bg-green-500' : status==='fail' ? 'bg-red-500' : 'bg-gray-400'}`}
    />
  )

  return (
    <div className="mb-3 p-2 rounded border dark:border-gray-700 bg-white dark:bg-[#171717] flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-2" title={t('healthSummary.coreAria', 'Core: server/API health')} aria-label={t('healthSummary.coreAria', 'Core: server/API health')}><Dot status={core}/> {t('healthSummary.core', 'Core')}</span>
        <span className="flex items-center gap-2" title={t('healthSummary.ragAria', 'RAG: knowledge index health')} aria-label={t('healthSummary.ragAria', 'RAG: knowledge index health')}><Dot status={rag}/> {t('healthSummary.rag', 'RAG')}</span>
      </div>
      <Tooltip title={t('healthSummary.diagnosticsTooltip', 'Open detailed diagnostics to troubleshoot or inspect health checks.') as string}>
        <Button
          size="small"
          type="link"
          className="text-blue-600 dark:text-blue-400"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={diagnosticsPanelId}
        >
          {t('healthSummary.diagnostics', 'Diagnostics')}
        </Button>
      </Tooltip>
      <Drawer title={t('healthSummary.diagnostics', 'Diagnostics')} placement="right" width={360} onClose={() => setOpen(false)} open={open}>
        <div id={diagnosticsPanelId} className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Dot status={core}/> {t('healthSummary.core', 'Core')}</span>
            <span className="text-gray-500">{coreCheckedAt ? new Date(coreCheckedAt).toLocaleString() : ''}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Dot status={rag}/> {t('healthSummary.rag', 'RAG')}</span>
            <span className="text-gray-500">{ragCheckedAt ? new Date(ragCheckedAt).toLocaleString() : ''}</span>
          </div>
          <div className="pt-3 text-xs text-gray-500">
            {t('healthSummary.footerInfo', 'These checks summarize the last successful ping to your tldw server and knowledge index.')}
          </div>
        </div>
      </Drawer>
    </div>
  )
}
