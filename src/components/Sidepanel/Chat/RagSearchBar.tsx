import React, { useState } from "react"
import { Input, Select, Button, Tag, Space, Tooltip, Spin, List, InputNumber } from "antd"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { browser } from "wxt/browser"
import { useTranslation } from "react-i18next"

type Props = {
  onInsert: (text: string) => void
  onAsk: (text: string) => void
}

type RagResult = {
  content?: string
  text?: string
  chunk?: string
  metadata?: any
}

const mediaTypes = [
  { label: "Any", value: "" },
  { label: "HTML", value: "html" },
  { label: "PDF", value: "pdf" },
  { label: "Document", value: "document" },
  { label: "Audio", value: "audio" },
  { label: "Video", value: "video" }
]

const dateRanges = [
  { label: "Any time", value: "" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" }
]

export const RagSearchBar: React.FC<Props> = ({ onInsert, onAsk }) => {
  const { t } = useTranslation(['sidepanel'])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [range, setRange] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RagResult[]>([])
  const [timeoutSec, setTimeoutSec] = useState<number>(10)
  const [timedOut, setTimedOut] = useState<boolean>(false)

  const runSearch = async () => {
    if (!q.trim()) return
    setLoading(true)
    setResults([])
    setTimedOut(false)
    try {
      await tldwClient.initialize()
      const filters: any = {}
      if (type) filters.type = type
      if (tags.length > 0) filters.tags = tags
      if (range) {
        const days = parseInt(range, 10)
        const from = new Date()
        from.setDate(from.getDate() - days)
        filters.date_from = from.toISOString()
      }
      const ms = Math.max(1, Math.round(timeoutSec||10)) * 1000
      const controller = { hit: false }
      const timeoutPromise = new Promise((_, rej) => setTimeout(() => { controller.hit = true; setTimedOut(true); rej(new Error('timeout')) }, ms + 100))
      const ragPromise = (async () => {
        const ragRes = await tldwClient.ragSearch(q, { top_k: 8, filters, timeoutMs: ms })
        return ragRes
      })()
      const ragRes = await Promise.race([ragPromise, timeoutPromise]) as any
      const docs = ragRes?.results || ragRes?.documents || ragRes?.docs || []
      setResults(docs)
      setTimedOut(false)
    } catch (e) {
      // Silent fail; parent UI remains usable
      if (!timedOut) setResults([])
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    const v = tagInput.trim()
    if (!v) return
    if (!tags.includes(v)) setTags([...tags, v])
    setTagInput("")
  }

  // Allow toolbar button to toggle this panel without prop drilling
  React.useEffect(() => {
    const handler = () => setOpen((v) => !v)
    window.addEventListener('tldw:toggle-rag', handler)
    return () => window.removeEventListener('tldw:toggle-rag', handler)
  }, [])

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          className="text-xs text-gray-600 dark:text-gray-300 underline md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide RAG Search" : "Show RAG Search"}
        </button>
      </div>
      {open && (
        <div className="p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f1f1f] mb-2">
          <div className="flex gap-2 items-center mb-2">
            <Input
              placeholder={t('sidepanel:rag.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onPressEnter={runSearch}
            />
            <Button onClick={runSearch} type="default">{t('sidepanel:rag.search')}</Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Select
              size="small"
              value={type}
              onChange={setType as any}
              options={mediaTypes}
              className="min-w-28"
            />
            <Select
              size="small"
              value={range}
              onChange={setRange as any}
              options={dateRanges}
              className="min-w-28"
            />
            <Space size="small">
              <Input
                size="small"
                placeholder={t('sidepanel:rag.addTagPlaceholder')}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={addTag}
                style={{ width: 120 }}
              />
              <Button size="small" onClick={addTag}>{t('sidepanel:rag.add')}</Button>
            </Space>
            <Space size="small" align="center">
              <span className="text-xs text-gray-500">Timeout (s)</span>
              <InputNumber size="small" min={1} value={timeoutSec} onChange={(v) => setTimeoutSec(Number(v||10))} />
            </Space>
            <div className="flex items-center gap-1 flex-wrap">
              {tags.map((t) => (
                <Tag key={t} closable onClose={() => setTags(tags.filter(x => x !== t))}>{t}</Tag>
              ))}
            </div>
          </div>
          <div>
            {loading ? (
              <div className="py-4 text-center"><Spin size="small" /></div>
            ) : timedOut ? (
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {t('sidepanel:rag.timeout.message')}
                <div className="mt-1 flex items-center gap-2">
                  <Button size="small" onClick={() => { setTimeoutSec((v) => Number(v||10) + 5); runSearch() }}>{t('sidepanel:rag.timeout.increase')}</Button>
                  <Button size="small" type="link" onClick={() => { try { const url = browser.runtime.getURL('/options.html#/settings/health'); browser.tabs.create({ url }) } catch { window.open('#/settings/health', '_blank') } }}>{t('sidepanel:rag.timeout.checkHealth')}</Button>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-xs text-gray-500">{t('sidepanel:rag.noResults')}</div>
            ) : (
              <List
                size="small"
                dataSource={results}
                renderItem={(item) => {
                  const content = item.content || item.text || item.chunk || ""
                  const meta = item.metadata || {}
                  const title = meta.title || meta.source || meta.url || ""
                  const url = meta.url || meta.source || ""
                  const snippet = content.slice(0, 240)
                  const insertText = `${snippet}${url ? `\n\nSource: ${url}` : ""}`
                  return (
                      <List.Item
                      actions={[
                        <a key="insert" onClick={() => onInsert(insertText)}>{t('sidepanel:rag.actions.insert')}</a>,
                        <a key="ask" onClick={() => onAsk(insertText)}>{t('sidepanel:rag.actions.ask')}</a>,
                        url ? <a key="open" onClick={() => window.open(String(url), '_blank')}>{t('sidepanel:rag.actions.open')}</a> : null,
                        <a key="copy" onClick={() => navigator.clipboard.writeText(insertText)}>{t('sidepanel:rag.actions.copy')}</a>
                      ]}
                    >
                      <List.Item.Meta
                        title={title}
                        description={<div className="text-xs line-clamp-3">{snippet}</div>}
                      />
                    </List.Item>
                  )
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RagSearchBar
