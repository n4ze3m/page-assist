import React from 'react'
import { Modal, Button, Input, Select, Space, Switch, Typography, Divider, List, Tag, message, Collapse, InputNumber, Tooltip as AntTooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { HelpCircle, Headphones, Layers, Database, FileText, Film, Cookie, Info, Clock, Grid, BookText } from 'lucide-react'
import { useStorage } from '@plasmohq/storage/hook'
import { confirmDanger } from '@/components/Common/confirm-danger'

type Entry = {
  id: string
  url: string
  type: 'auto' | 'html' | 'pdf' | 'document' | 'audio' | 'video'
  // Simple per-type options; server can ignore unknown fields
  audio?: { language?: string; diarize?: boolean }
  document?: { ocr?: boolean }
  video?: { captions?: boolean }
}

type ResultItem = { id: string; status: 'ok' | 'error'; url?: string; fileName?: string; type: string; data?: any; error?: string }

type Props = {
  open: boolean
  onClose: () => void
}

function detectTypeFromUrl(url: string): Entry['type'] {
  try {
    const u = new URL(url)
    const p = (u.pathname || '').toLowerCase()
    if (p.match(/\.(mp3|wav|flac|m4a|aac)$/)) return 'audio'
    if (p.match(/\.(mp4|mov|mkv|webm)$/)) return 'video'
    if (p.match(/\.(pdf)$/)) return 'pdf'
    if (p.match(/\.(doc|docx|txt|rtf|md)$/)) return 'document'
    return 'html'
  } catch {
    return 'auto'
  }
}

export const QuickIngestModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation(['option'])
  const [storeRemote, setStoreRemote] = React.useState<boolean>(true)
  const [rows, setRows] = React.useState<Entry[]>([
    { id: crypto.randomUUID(), url: '', type: 'auto' }
  ])
  // Common ingest options available across media types (promote booleans only; rely on Advanced for the rest)
  const [common, setCommon] = React.useState<{ perform_analysis: boolean; perform_chunking: boolean; overwrite_existing: boolean }>({
    perform_analysis: true,
    perform_chunking: true,
    overwrite_existing: false
  })
  const [running, setRunning] = React.useState<boolean>(false)
  const [results, setResults] = React.useState<ResultItem[]>([])
  const [localFiles, setLocalFiles] = React.useState<File[]>([])
  const [advancedOpen, setAdvancedOpen] = React.useState<boolean>(true)
  const [advancedValues, setAdvancedValues] = React.useState<Record<string, any>>({})
  const [advSchema, setAdvSchema] = React.useState<Array<{ name: string; type: string; enum?: any[]; description?: string; title?: string; group: string }>>([])
  const [specSource, setSpecSource] = React.useState<'server' | 'server-cached' | 'bundled' | 'none'>('none')
  const [bundledSpec, setBundledSpec] = React.useState<any | null>(null)
  const [fieldDetailsOpen, setFieldDetailsOpen] = React.useState<Record<string, boolean>>({})
  const [advSearch, setAdvSearch] = React.useState<string>('')
  const [savedAdvValues, setSavedAdvValues] = useStorage<Record<string, any>>('quickIngestAdvancedValues', {})
  const [uiPrefs, setUiPrefs] = useStorage<{ advancedOpen?: boolean; fieldDetailsOpen?: Record<string, boolean> }>('quickIngestAdvancedUI', {})
  const [specPrefs, setSpecPrefs] = useStorage<{ preferServer?: boolean; lastRemote?: { version?: string; cachedAt?: number; spec?: any } }>('quickIngestSpecPrefs', { preferServer: true })

  const addRow = () => setRows((r) => [...r, { id: crypto.randomUUID(), url: '', type: 'auto' }])
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id))
  const updateRow = (id: string, patch: Partial<Entry>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const bulkPaste = (text: string) => {
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    const next: Entry[] = lines.map((u) => ({ id: crypto.randomUUID(), url: u, type: detectTypeFromUrl(u) }))
    setRows(next)
  }

  const run = async () => {
    const valid = rows.filter((r) => r.url.trim().length > 0)
    if (valid.length === 0 && localFiles.length === 0) {
      message.error('Please add at least one URL or file')
      return
    }
    setRunning(true)
    setResults([])
    try {
      await tldwClient.initialize()
    } catch {}
    const out: ResultItem[] = []
    for (const r of valid) {
      const t = r.type === 'auto' ? detectTypeFromUrl(r.url) : r.type
      try {
        let data: any
        if (storeRemote) {
          // Ingest & store via multipart form
          const fields: Record<string, any> = {
            urls: r.url,
            media_type: t,
            perform_analysis: common.perform_analysis,
            perform_chunking: common.perform_chunking,
            overwrite_existing: common.overwrite_existing
          }
          // Merge advanced values; rebuild nested structure for dot-notation keys
          const nested: Record<string, any> = {}
          const assignPath = (obj: any, path: string[], val: any) => {
            let cur = obj
            for (let i = 0; i < path.length; i++) {
              const seg = path[i]
              if (i === path.length - 1) cur[seg] = val
              else cur = (cur[seg] = cur[seg] || {})
            }
          }
          for (const [k, v] of Object.entries(advancedValues)) {
            if (k.includes('.')) assignPath(nested, k.split('.'), v)
            else fields[k] = v
          }
          for (const [k, v] of Object.entries(nested)) fields[k] = v
          if (r.audio?.language) fields['transcription_language'] = r.audio.language
          if (typeof r.audio?.diarize === 'boolean') fields['diarize'] = r.audio.diarize
          if (typeof r.video?.captions === 'boolean') fields['timestamp_option'] = r.video.captions
          // Document/PDF OCR hint (best-effort)
          if (typeof r.document?.ocr === 'boolean') fields['pdf_parsing_engine'] = r.document.ocr ? 'pymupdf4llm' : ''
          data = await tldwClient.addMediaForm(fields)
        } else {
          // Process only (no store)
          const nestedBody: Record<string, any> = {}
          const assignPath = (obj: any, path: string[], val: any) => {
            let cur = obj
            for (let i = 0; i < path.length; i++) {
              const seg = path[i]
              if (i === path.length - 1) cur[seg] = val
              else cur = (cur[seg] = cur[seg] || {})
            }
          }
          for (const [k, v] of Object.entries(advancedValues)) {
            if (k.includes('.')) assignPath(nestedBody, k.split('.'), v)
            else nestedBody[k] = v
          }
          data = await tldwClient.ingestWebContent(r.url, { type: t, audio: r.audio, document: r.document, video: r.video, ...common, ...nestedBody })
        }
        out.push({ id: r.id, status: 'ok', url: r.url, type: t, data })
        setResults([...out])
      } catch (e: any) {
        out.push({ id: r.id, status: 'error', url: r.url, type: t, error: e?.message || 'Request failed' })
        setResults([...out])
      }
    }
    // Process local files (upload or process)
    for (const f of localFiles) {
      const id = crypto.randomUUID()
      try {
        let data: any
        const ft = (f.type || '').toLowerCase()
        const mediaType: Entry['type'] = ft.startsWith('audio/') ? 'audio' : ft.startsWith('video/') ? 'video' : ft.includes('pdf') ? 'pdf' : 'document'
        if (storeRemote) {
          const fields: Record<string, any> = {
            media_type: mediaType,
            perform_analysis: common.perform_analysis,
            perform_chunking: common.perform_chunking,
            overwrite_existing: common.overwrite_existing
          }
          // Merge advanced values (respect dot notation like above)
          const nested: Record<string, any> = {}
          const assignPath = (obj: any, path: string[], val: any) => {
            let cur = obj
            for (let i = 0; i < path.length; i++) {
              const seg = path[i]
              if (i === path.length - 1) cur[seg] = val
              else cur = (cur[seg] = cur[seg] || {})
            }
          }
          for (const [k, v] of Object.entries(advancedValues)) {
            if (k.includes('.')) assignPath(nested, k.split('.'), v)
            else fields[k] = v
          }
          for (const [k, v] of Object.entries(nested)) fields[k] = v
          data = await tldwClient.uploadMedia(f, fields)
        } else {
          // Process without storing
          if (ft.startsWith('audio/')) {
            data = await tldwClient.transcribeAudio(f)
          } else {
            // Best-effort: Some servers allow process-only via flags on add endpoint
            const fields: Record<string, any> = {
              media_type: mediaType,
              perform_analysis: common.perform_analysis,
              perform_chunking: common.perform_chunking,
              overwrite_existing: false,
              process_only: true
            }
            const nested: Record<string, any> = {}
            const assignPath = (obj: any, path: string[], val: any) => {
              let cur = obj
              for (let i = 0; i < path.length; i++) {
                const seg = path[i]
                if (i === path.length - 1) cur[seg] = val
                else cur = (cur[seg] = cur[seg] || {})
              }
            }
            for (const [k, v] of Object.entries(advancedValues)) {
              if (k.includes('.')) assignPath(nested, k.split('.'), v)
              else fields[k] = v
            }
            for (const [k, v] of Object.entries(nested)) fields[k] = v
            data = await tldwClient.uploadMedia(f, fields)
          }
        }
        out.push({ id, status: 'ok', fileName: f.name, type: mediaType, data })
        setResults([...out])
      } catch (e: any) {
        out.push({ id, status: 'error', fileName: f.name, type: 'file', error: e?.message || 'Upload failed' })
        setResults([...out])
      }
    }
    setRunning(false)
    if (!storeRemote && out.length > 0) message.info('Processing complete. You can download results as JSON.')
  }

  // Load OpenAPI schema to build advanced fields (best-effort)
  const groupForField = (name: string): string => {
    const n = name.toLowerCase()
    if (n.startsWith('transcription_') || ['diarize','vad_use','timestamp_option','chunk_language'].includes(n)) return 'Transcription'
    if (n.startsWith('chunk_') || ['use_adaptive_chunking','enable_contextual_chunking','use_multi_level_chunking','perform_chunking','contextual_llm_model'].includes(n)) return 'Chunking'
    if (n.includes('embedding')) return 'Embeddings'
    if (n.startsWith('context_') || n === 'context_strategy') return 'Context'
    if (n.includes('summarization') || n.includes('analysis') || n === 'system_prompt' || n === 'custom_prompt') return 'Analysis/Summarization'
    if (n.includes('pdf') || n.includes('ocr')) return 'Document/PDF'
    if (n.includes('video') || n === 'timestamp_option') return 'Video'
    if (n.includes('cookie')) return 'Cookies/Auth'
    if (['author','title','keywords','api_name'].includes(n)) return 'Metadata'
    if (['start_time','end_time'].includes(n)) return 'Timing'
    return 'Other'
  }

  const iconForGroup = (group: string) => {
    const cls = 'w-4 h-4 mr-1 text-gray-500'
    switch (group) {
      case 'Transcription':
        return <Headphones className={cls} />
      case 'Chunking':
        return <Layers className={cls} />
      case 'Embeddings':
        return <Database className={cls} />
      case 'Context':
        return <Layers className={cls} />
      case 'Analysis/Summarization':
        return <BookText className={cls} />
      case 'Document/PDF':
        return <FileText className={cls} />
      case 'Video':
        return <Film className={cls} />
      case 'Cookies/Auth':
        return <Cookie className={cls} />
      case 'Metadata':
        return <Info className={cls} />
      case 'Timing':
        return <Clock className={cls} />
      default:
        return <Grid className={cls} />
    }
  }

  const parseSpec = (spec: any) => {
    const getByRef = (ref: string): any => {
      // Handles refs like '#/components/schemas/MediaIngestRequest'
      if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null
      const parts = ref.slice(2).split('/')
      let cur: any = spec
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
        else return null
      }
      return cur
    }

    const resolveRef = (schema: any): any => {
      if (!schema) return {}
      if (schema.$ref) {
        const target = getByRef(schema.$ref)
        return target ? resolveRef(target) : {}
      }
      return schema
    }

    const mergeProps = (schema: any): Record<string, any> => {
      const s = resolveRef(schema)
      let props: Record<string, any> = {}
      if (!s || typeof s !== 'object') return props
      // Merge from compositions
      for (const key of ['allOf', 'oneOf', 'anyOf'] as const) {
        if (Array.isArray((s as any)[key])) {
          for (const sub of (s as any)[key]) {
            props = { ...props, ...mergeProps(sub) }
          }
        }
      }
      if (s.properties && typeof s.properties === 'object') {
        for (const [k, v] of Object.entries<any>(s.properties)) {
          props[k] = resolveRef(v)
        }
      }
      return props
    }

    const flattenProps = (obj: Record<string, any>, parent = ''): Array<[string, any]> => {
      const out: Array<[string, any]> = []
      for (const [k, v0] of Object.entries<any>(obj || {})) {
        const v = resolveRef(v0)
        const name = parent ? `${parent}.${k}` : k
        const isObj = (v?.type === 'object' && v?.properties && typeof v.properties === 'object')
        if (isObj) {
          const child = mergeProps(v)
          out.push(...flattenProps(child, name))
        } else {
          out.push([name, v])
        }
      }
      return out
    }

    const paths = spec?.paths || {}
    const mediaAdd = paths['/api/v1/media/add'] || paths['/api/v1/media/add/']
    const content = mediaAdd?.post?.requestBody?.content || {}
    const mp = content['multipart/form-data'] || content['application/x-www-form-urlencoded'] || content['application/json'] || {}
    const rootSchema = mp?.schema || {}
    const props = mergeProps(rootSchema)
    const flat = flattenProps(props)

    const entries: Array<{ name: string; type: string; enum?: any[]; description?: string; title?: string; group: string }> = []
    // Expose all available ingestion-time options, except input list and media type selector which are handled above
    const exclude = new Set([ 'urls', 'media_type' ])
    for (const [name, def0] of flat) {
      if (exclude.has(name)) continue
      const def = resolveRef(def0)
      // Infer a reasonable type
      let type: string = 'string'
      if (def.type) type = Array.isArray(def.type) ? String(def.type[0]) : String(def.type)
      else if (def.enum) type = 'string'
      else if (def.anyOf || def.oneOf) type = 'string'
      const en = Array.isArray(def?.enum) ? def.enum : undefined
      const description = def?.description || def?.title || undefined
      entries.push({ name, type, enum: en, description, title: def?.title, group: groupForField(name) })
    }
    entries.sort((a,b) => a.name.localeCompare(b.name))
    setAdvSchema(entries)
  }

  const loadSpec = React.useCallback(async (preferServer = true, reportDiff = false) => {
    let used: 'server' | 'bundled' | 'none' = 'none'
    let remote: any | null = null
    if (preferServer) {
      try {
        const healthy = await tldwClient.healthCheck()
        if (healthy) remote = await tldwClient.getOpenAPISpec()
      } catch {}
    }
    if (remote) {
      parseSpec(remote)
      used = 'server'
      try {
        const rVer = remote?.info?.version
        setSpecPrefs({ ...(specPrefs || {}), preferServer: true, lastRemote: { version: rVer, cachedAt: Date.now(), spec: remote } })
      } catch {}
      if (reportDiff && bundledSpec) {
        // Compare fields
        const bundledPaths = bundledSpec?.paths || {}
        const bContent = (bundledPaths['/api/v1/media/add'] || bundledPaths['/api/v1/media/add/'])?.post?.requestBody?.content || {}
        const bProps = (bContent['multipart/form-data'] || bContent['application/x-www-form-urlencoded'] || {})?.schema?.properties || {}
        const rPaths = remote?.paths || {}
        const rContent = (rPaths['/api/v1/media/add'] || rPaths['/api/v1/media/add/'])?.post?.requestBody?.content || {}
        const rProps = (rContent['multipart/form-data'] || rContent['application/x-www-form-urlencoded'] || {})?.schema?.properties || {}
        const bSet = new Set(Object.keys(bProps))
        const rSet = new Set(Object.keys(rProps))
        const newFields = [...rSet].filter((k) => !bSet.has(k))
        const missingFields = [...bSet].filter((k) => !rSet.has(k))
        const bVer = bundledSpec?.info?.version
        const rVer = remote?.info?.version
        if (newFields.length || missingFields.length || (bVer && rVer && bVer !== rVer)) {
          const msgs: string[] = []
          if (bVer && rVer && bVer !== rVer) msgs.push(`Spec version differs (server: ${rVer}, bundled: ${bVer})`)
          if (newFields.length) msgs.push(`Server has new fields: ${newFields.slice(0,6).join(', ')}${newFields.length>6?'…':''}`)
          if (missingFields.length) msgs.push(`Bundled fields not on server: ${missingFields.slice(0,6).join(', ')}${missingFields.length>6?'…':''}`)
          message.warning(msgs.join(' • '))
        } else {
          message.success('Advanced spec reloaded from server')
        }
      }
    } else {
      // Try cached last remote spec from storage
      if (preferServer && specPrefs?.lastRemote?.spec) {
        try {
          parseSpec(specPrefs.lastRemote.spec)
          setSpecSource('server-cached')
          return
        } catch {}
      }
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const localSpec = await import('../../../openapi.json')
        setBundledSpec(localSpec)
        parseSpec(localSpec)
        used = 'bundled'
      } catch {
        setAdvSchema([
          { name: 'context_window_size', type: 'integer', group: groupForField('context_window_size') },
          { name: 'generate_embeddings', type: 'boolean', group: groupForField('generate_embeddings') },
          { name: 'embedding_model', type: 'string', group: groupForField('embedding_model') },
          { name: 'embedding_provider', type: 'string', group: groupForField('embedding_provider') },
          { name: 'perform_rolling_summarization', type: 'boolean', group: groupForField('perform_rolling_summarization') },
          { name: 'perform_confabulation_check_of_analysis', type: 'boolean', group: groupForField('perform_confabulation_check_of_analysis') },
          { name: 'system_prompt', type: 'string', group: groupForField('system_prompt') },
          { name: 'custom_prompt', type: 'string', group: groupForField('custom_prompt') },
          { name: 'title', type: 'string', group: groupForField('title') }
        ])
        used = 'none'
      }
    }
    setSpecSource(used)
  }, [bundledSpec, setSpecPrefs, specPrefs])

  React.useEffect(() => {
    (async () => {
      // Load bundled once for diffing later
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const localSpec = await import('../../../openapi.json')
        setBundledSpec(localSpec)
      } catch {}
      // Prefer server
      const prefer = typeof specPrefs?.preferServer === 'boolean' ? specPrefs.preferServer : true
      await loadSpec(prefer)
      if (specSource === 'none') await loadSpec(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load persisted advanced values on mount
  React.useEffect(() => {
    if (savedAdvValues && typeof savedAdvValues === 'object') {
      setAdvancedValues((prev) => ({ ...prev, ...savedAdvValues }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist advanced values when they change (light debounce)
  React.useEffect(() => {
    const id = setTimeout(() => {
      try { setSavedAdvValues(advancedValues) } catch {}
    }, 200)
    return () => clearTimeout(id)
  }, [advancedValues, setSavedAdvValues])

  // Restore UI prefs for Advanced section and details
  React.useEffect(() => {
    if (uiPrefs?.advancedOpen !== undefined) setAdvancedOpen(Boolean(uiPrefs.advancedOpen))
    if (uiPrefs?.fieldDetailsOpen && typeof uiPrefs.fieldDetailsOpen === 'object') setFieldDetailsOpen(uiPrefs.fieldDetailsOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist UI prefs
  React.useEffect(() => {
    const id = setTimeout(() => {
      try { setUiPrefs({ advancedOpen, fieldDetailsOpen }) } catch {}
    }, 200)
    return () => clearTimeout(id)
  }, [advancedOpen, fieldDetailsOpen, setUiPrefs])

  const downloadJson = (item: ResultItem) => {
    const blob = new Blob([JSON.stringify(item.data ?? {}, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'processed.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Modal title={t('quickIngest.title') || 'Quick Ingest Media'} open={open} onCancel={onClose} footer={null} width={760} destroyOnClose>
      <Space direction="vertical" className="w-full">
        <div className="flex items-center justify-between">
          <Typography.Text>{t('quickIngest.subtitle') || 'Enter one or more URLs. Force type per row if needed.'}</Typography.Text>
          <Space align="center">
            <Typography.Text>{t('quickIngest.storeRemote') || 'Store to remote DB'}</Typography.Text>
            <Switch checked={storeRemote} onChange={setStoreRemote} />
          </Space>
        </div>

        <Input.TextArea placeholder={t('quickIngest.bulkPlaceholder') || 'Paste URLs (one per line)'} onPressEnter={(e) => e.stopPropagation()} autoSize={{ minRows: 2 }} onBlur={(e) => bulkPaste(e.target.value)} />
        <Divider plain>{t('quickIngest.or') || 'or'}</Divider>

        <Space direction="vertical" className="w-full">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-2">
              <Input placeholder="https://..." value={row.url} onChange={(e) => updateRow(row.id, { url: e.target.value })} />
              <Select
                className="min-w-32"
                value={row.type}
                onChange={(v) => updateRow(row.id, { type: v as Entry['type'] })}
                options={[
                  { label: 'Auto', value: 'auto' },
                  { label: 'HTML', value: 'html' },
                  { label: 'PDF', value: 'pdf' },
                  { label: 'Document', value: 'document' },
                  { label: 'Audio', value: 'audio' },
                  { label: 'Video', value: 'video' }
                ]}
              />
              <Button onClick={() => removeRow(row.id)} danger>{t('quickIngest.remove') || 'Remove'}</Button>
            </div>
          ))}
          <Button onClick={addRow}>{t('quickIngest.add') || 'Add URL'}</Button>
        </Space>

        <Divider plain>{t('quickIngest.or') || 'or'}</Divider>
        {/* Local file upload */}
        <Space direction="vertical" className="w-full">
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            id="qi-file-input"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) setLocalFiles((prev) => [...prev, ...files])
              e.currentTarget.value = ''
            }}
            accept=".pdf,.txt,.rtf,.doc,.docx,.md,.epub,application/pdf,text/plain,application/rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,audio/*,video/*"
          />
          <Button onClick={() => document.getElementById('qi-file-input')?.click()}>
            {t('quickIngest.addFiles') || 'Add Files'}
          </Button>
          {localFiles.length > 0 && (
            <List
              size="small"
              bordered
              dataSource={localFiles}
              renderItem={(f, idx) => (
                <List.Item
                  actions={[<a key="remove" onClick={() => setLocalFiles((prev) => prev.filter((_, i) => i !== idx))}>{t('quickIngest.remove') || 'Remove'}</a>]}
                >
                  <span className="truncate">{f.name}</span>
                </List.Item>
              )}
            />
          )}
        </Space>

        {/* Common ingestion options */}
        <div className="mt-3">
          <Typography.Title level={5}>{t('quickIngest.commonOptions') || 'Ingestion options'}</Typography.Title>
          <Space wrap size="middle" align="center">
            <Space align="center">
              <span>Analysis</span>
              <Switch checked={common.perform_analysis} onChange={(v) => setCommon((c) => ({ ...c, perform_analysis: v }))} />
            </Space>
            <Space align="center">
              <span>Chunking</span>
              <Switch checked={common.perform_chunking} onChange={(v) => setCommon((c) => ({ ...c, perform_chunking: v }))} />
            </Space>
            <Space align="center">
              <span>Overwrite existing</span>
              <Switch checked={common.overwrite_existing} onChange={(v) => setCommon((c) => ({ ...c, overwrite_existing: v }))} />
            </Space>
          </Space>
        </div>

        {/* Per-type options: show union of all detected types */}
        {rows.some((r) => (r.type === 'audio' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'audio'))) && (
          <div className="mt-2">
            <Typography.Title level={5}>{t('quickIngest.audioOptions') || 'Audio options'}</Typography.Title>
            <Space className="w-full">
              <Input placeholder={t('quickIngest.audioLanguage') || 'Language (e.g., en)'} onChange={(e) => setRows((rs) => rs.map((x) => ({ ...x, audio: { ...(x.audio || {}), language: e.target.value } })))} />
              <Select className="min-w-40" defaultValue={false} onChange={(v) => setRows((rs) => rs.map((x) => ({ ...x, audio: { ...(x.audio || {}), diarize: Boolean(v) } })))} options={[{ label: 'Diarization: Off', value: false }, { label: 'Diarization: On', value: true }]} />
            </Space>
          </div>
        )}

        {rows.some((r) => (r.type === 'document' || r.type === 'pdf' || (r.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(r.url))))) && (
          <div className="mt-2">
            <Typography.Title level={5}>{t('quickIngest.documentOptions') || 'Document options'}</Typography.Title>
            <Select className="min-w-40" defaultValue={false} onChange={(v) => setRows((rs) => rs.map((x) => ({ ...x, document: { ...(x.document || {}), ocr: Boolean(v) } })))} options={[{ label: 'OCR: Off', value: false }, { label: 'OCR: On', value: true }]} />
          </div>
        )}

        {rows.some((r) => (r.type === 'video' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'video'))) && (
          <div className="mt-2">
            <Typography.Title level={5}>{t('quickIngest.videoOptions') || 'Video options'}</Typography.Title>
            <Select className="min-w-40" defaultValue={false} onChange={(v) => setRows((rs) => rs.map((x) => ({ ...x, video: { ...(x.video || {}), captions: Boolean(v) } })))} options={[{ label: 'Captions: Off', value: false }, { label: 'Captions: On', value: true }]} />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <Button onClick={onClose}>{t('quickIngest.cancel') || 'Cancel'}</Button>
          <Button type="primary" loading={running} onClick={run}>{storeRemote ? (t('quickIngest.ingest') || 'Ingest') : (t('quickIngest.process') || 'Process')}</Button>
        </div>

        <Collapse className="mt-3" activeKey={advancedOpen ? ['adv'] : []} onChange={(k) => setAdvancedOpen(Array.isArray(k) ? k.includes('adv') : Boolean(k))} items={[{
          key: 'adv',
          label: (
            <div className="flex items-center gap-2 w-full">
              <span>Advanced options</span>
              <div className="flex items-center gap-2 ml-auto">
                <Tag color={specSource.startsWith('server') ? 'green' : specSource === 'bundled' ? 'default' : 'red'}>
                  {specSource === 'server' ? 'Spec: server' : specSource === 'server-cached' ? 'Spec: server (cached)' : specSource === 'bundled' ? 'Spec: bundled' : 'Spec: none'}
                </Tag>
                <Space size="small" align="center">
                  <span className="text-xs text-gray-500">Prefer server</span>
                  <Switch size="small" checked={!!specPrefs?.preferServer} onChange={async (v) => { setSpecPrefs({ ...(specPrefs||{}), preferServer: v }); await loadSpec(v, true) }} />
                </Space>
                <Button size="small" onClick={(e) => { e.stopPropagation(); void loadSpec(true, true) }}>Reload from server</Button>
                <Button size="small" danger onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirmDanger({ title: 'Please confirm', content: 'Reset all advanced options and UI state?', okText: 'Reset', cancelText: 'Cancel' })
                  if (!ok) return
                  setAdvancedValues({}); setSavedAdvValues({}); setFieldDetailsOpen({}); setUiPrefs({ advancedOpen: false, fieldDetailsOpen: {} }); setAdvSearch(''); setAdvancedOpen(false); message.success('Advanced options reset')
                }}>Reset Advanced</Button>
                <AntTooltip title={<div className="max-w-80 text-xs">Clears saved Advanced values and UI state (search, open sections, field details). Does not affect regular ingest options.</div>}>
                  <Info className="w-4 h-4 text-gray-500" />
                </AntTooltip>
              </div>
            </div>
          ),
          children: (
        <Space direction="vertical" className="w-full">
              <div className="flex items-center gap-2">
                <Input
                  allowClear
                  placeholder="Search advanced fields..."
                  value={advSearch}
                  onChange={(e) => setAdvSearch(e.target.value)}
                  className="max-w-80"
                />
              </div>
              {advSchema.length === 0 ? (
                <Typography.Text type="secondary">No advanced options detected.</Typography.Text>
              ) : (
                (() => {
                  const grouped: Record<string, typeof advSchema> = {}
                  const q = advSearch.trim().toLowerCase()
                  const match = (f: { name: string; title?: string; description?: string }) => {
                    if (!q) return true
                    return (
                      f.name.toLowerCase().includes(q) ||
                      (f.title || '').toLowerCase().includes(q) ||
                      (f.description || '').toLowerCase().includes(q)
                    )
                  }
                  for (const f of advSchema.filter(match)) {
                    if (!grouped[f.group]) grouped[f.group] = []
                    grouped[f.group].push(f)
                  }
                  const order = Object.keys(grouped).sort()
                  return order.map((g) => (
                    <div key={g} className="mb-2">
                      <Typography.Title level={5} className="!mb-2 flex items-center">{iconForGroup(g)}{g}</Typography.Title>
                      <Space direction="vertical" className="w-full">
                        {grouped[g].map((f) => {
                          const v = advancedValues[f.name]
                          const setV = (nv: any) => setAdvancedValues((prev) => ({ ...prev, [f.name]: nv }))
                          const isOpen = fieldDetailsOpen[f.name]
                          const setOpen = (open: boolean) => setFieldDetailsOpen((prev) => ({ ...prev, [f.name]: open }))
                          const Label = (
                            <div className="flex items-center gap-1">
                              <span className="min-w-60 text-sm">{f.title || f.name}</span>
                              {f.description ? (
                                <AntTooltip placement="right" trigger={["hover","click"]} title={<div className="max-w-96 text-xs">{f.description}</div>}>
                                  <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                                </AntTooltip>
                              ) : null}
                            </div>
                          )
                          if (f.enum && f.enum.length > 0) {
                            return (
                              <div key={f.name} className="flex items-center gap-2">
                                {Label}
                                <Select className="w-72" allowClear value={v} onChange={setV as any} options={f.enum.map((e) => ({ value: e, label: String(e) }))} />
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                                )}
                              </div>
                            )
                          }
                          if (f.type === 'boolean') {
                            return (
                              <div key={f.name} className="flex items-center gap-2">
                                {Label}
                                <Select className="w-40" value={v ?? ''} onChange={setV as any} options={[{ value: '', label: 'Unset' }, { value: 'true', label: 'true' }, { value: 'false', label: 'false' }]} />
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                                )}
                              </div>
                            )
                          }
                          if (f.type === 'integer' || f.type === 'number') {
                            return (
                              <div key={f.name} className="flex items-center gap-2">
                                {Label}
                                <InputNumber className="w-40" value={v} onChange={setV as any} />
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                                )}
                              </div>
                            )
                          }
                          return (
                            <div key={f.name} className="flex items-center gap-2">
                              {Label}
                              <Input className="w-96" value={v} onChange={(e) => setV(e.target.value)} />
                              {f.description && (
                                <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                              )}
                            </div>
                          )
                        })}
                      {/* details sections */}
                      {grouped[g].map((f) => (
                        f.description && fieldDetailsOpen[f.name] ? (
                          <div key={`${f.name}-details`} className="ml-4 mt-1 p-2 rounded bg-gray-50 dark:bg-[#262626] text-xs text-gray-600 dark:text-gray-300 max-w-[48rem]">
                            {f.description}
                          </div>
                        ) : null
                      ))}
                      </Space>
                    </div>
                  ))
                })()
              )}
            </Space>
          )
        }]} />

        {results.length > 0 && (
          <div className="mt-4">
            <Typography.Title level={5}>{t('quickIngest.results') || 'Results'}</Typography.Title>
            <List
              size="small"
              dataSource={results}
              renderItem={(item) => (
                <List.Item actions={[
                  !storeRemote && item.status === 'ok' ? <a key="dl" onClick={() => downloadJson(item)}>{t('quickIngest.downloadJson') || 'Download JSON'}</a> : null
                ]}>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <Tag color={item.status === 'ok' ? 'green' : 'red'}>{item.status.toUpperCase()}</Tag>
                      <span>{item.type.toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-gray-500 break-all">{item.url}</div>
                    {item.error ? <div className="text-xs text-red-500">{item.error}</div> : null}
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}
      </Space>
    </Modal>
  )
}

export default QuickIngestModal
