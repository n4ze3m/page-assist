import { useEffect, useState } from 'react'
import { Button } from 'antd'
import { getAllProcessed, deleteProcessed, clearProcessed } from '@/db/dexie/processed'
import type { ProcessedMedia } from '@/db/dexie/types'

export default function OptionProcessed() {
  const [items, setItems] = useState<ProcessedMedia[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setItems(await getAllProcessed()) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const handleDelete = async (id: string) => {
    await deleteProcessed(id)
    await load()
  }

  const handleClear = async () => {
    await clearProcessed()
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Processed Items (Local)</h2>
        <Button
          size="small"
          onClick={handleClear}
          disabled={loading || items.length === 0}
        >
          Clear all
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        These items are cached locally in your browser after media runs. Clearing them does not delete anything from your tldw server.
      </p>
      {loading ? (
        <div>Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No processed items stored locally.</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((it) => (
            <li key={it.id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium break-all">{it.title || it.url}</div>
                  <div className="text-xs text-gray-500 break-all">{it.url}</div>
                  {it.content && (
                    <div className="mt-2 text-sm line-clamp-3 whitespace-pre-wrap">{it.content.slice(0, 500)}</div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    size="small"
                    type="link"
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() => handleDelete(it.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
