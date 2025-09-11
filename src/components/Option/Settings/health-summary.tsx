import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { tldwClient } from '@/services/tldw/TldwApiClient'

export default function HealthSummary() {
  const [core, setCore] = useState<'unknown'|'ok'|'fail'>('unknown')
  const [rag, setRag] = useState<'unknown'|'ok'|'fail'>('unknown')

  useEffect(() => {
    (async () => {
      try {
        await tldwClient.initialize()
        const ok = await tldwClient.healthCheck()
        setCore(ok ? 'ok' : 'fail')
      } catch { setCore('fail') }
      try {
        await tldwClient.ragHealth()
        setRag('ok')
      } catch { setRag('fail') }
    })()
  }, [])

  const Dot = ({ status }: { status: 'unknown'|'ok'|'fail' }) => (
    <span className={`inline-block w-2 h-2 rounded-full ${status==='ok' ? 'bg-green-500' : status==='fail' ? 'bg-red-500' : 'bg-gray-400'}`} />
  )

  return (
    <div className="mb-3 p-2 rounded border dark:border-gray-700 bg-white dark:bg-[#171717] flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-2"><Dot status={core}/> Core</span>
        <span className="flex items-center gap-2"><Dot status={rag}/> RAG</span>
      </div>
      <Link to="/settings/health" className="text-xs text-blue-600 dark:text-blue-400">Details</Link>
    </div>
  )
}

