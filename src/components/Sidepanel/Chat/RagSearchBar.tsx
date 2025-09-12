import React, { useState } from "react"
import { Input, Select, Button, Tag, Space, Tooltip, Spin, List } from "antd"
import { tldwClient } from "@/services/tldw/TldwApiClient"

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
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [range, setRange] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RagResult[]>([])

  const runSearch = async () => {
    if (!q.trim()) return
    setLoading(true)
    setResults([])
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
      const ragRes = await tldwClient.ragSearch(q, { top_k: 8, filters })
      const docs = ragRes?.results || ragRes?.documents || ragRes?.docs || []
      setResults(docs)
    } catch (e) {
      // Silent fail; parent UI remains usable
      setResults([])
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

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          className="text-xs text-gray-600 dark:text-gray-300 underline"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide RAG Search" : "Show RAG Search"}
        </button>
      </div>
      {open && (
        <div className="p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f1f1f] mb-2">
          <div className="flex gap-2 items-center mb-2">
            <Input
              placeholder="Search your knowledge…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onPressEnter={runSearch}
            />
            <Button onClick={runSearch} type="default">Search</Button>
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
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={addTag}
                style={{ width: 120 }}
              />
              <Button size="small" onClick={addTag}>Add</Button>
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
            ) : results.length === 0 ? (
              <div className="text-xs text-gray-500">No results</div>
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
                        <a key="insert" onClick={() => onInsert(insertText)}>Insert</a>,
                        <a key="ask" onClick={() => onAsk(insertText)}>Ask</a>
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

