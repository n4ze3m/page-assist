import React from 'react'
import type { InputRef } from 'antd'
import { Input, Typography, Select } from 'antd'
import { bgRequest } from '@/services/background-proxy'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useServerOnline } from '@/hooks/useServerOnline'
import { useConfirmDanger } from '@/components/Common/confirm-danger'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import FeatureEmptyState from '@/components/Common/FeatureEmptyState'
import { useDemoMode } from '@/context/demo-mode'
import { useServerCapabilities } from '@/hooks/useServerCapabilities'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { useAntdMessage } from '@/hooks/useAntdMessage'
import { useStoreMessageOption } from "@/store/option"
import { updatePageTitle } from "@/utils/update-page-title"
import { useScrollToServerCard } from "@/hooks/useScrollToServerCard"
import { MarkdownPreview } from "@/components/Common/MarkdownPreview"
import NotesToolbar from "@/components/Notes/NotesToolbar"
import NotesEditorHeader from "@/components/Notes/NotesEditorHeader"
import NotesListPanel from "@/components/Notes/NotesListPanel"
import type { NoteListItem } from "@/components/Notes/types"
const extractBacklink = (note: any) => {
  const meta = note?.metadata || {}
  const backlinks = meta?.backlinks || meta || {}
  const conversation =
    note?.conversation_id ??
    backlinks?.conversation_id ??
    backlinks?.conversationId ??
    meta?.conversation_id ??
    null
  const message =
    note?.message_id ??
    backlinks?.message_id ??
    backlinks?.messageId ??
    meta?.message_id ??
    null
  return {
    conversation_id: conversation != null ? String(conversation) : null,
    message_id: message != null ? String(message) : null
  }
}

const extractKeywords = (note: any): string[] => {
  const rawKeywords = (Array.isArray(note?.metadata?.keywords)
    ? note.metadata.keywords
    : Array.isArray(note?.keywords)
      ? note.keywords
      : []) as any[]
  return (rawKeywords || [])
    .map((item: any) =>
      String(
        item?.keyword ||
          item?.keyword_text ||
          item?.text ||
          item
      )
    )
    .filter((s) => s && s.trim().length > 0)
}

const NotesManagerPage: React.FC = () => {
  const { t } = useTranslation(['option', 'common'])
  const [query, setQuery] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [selectedId, setSelectedId] = React.useState<string | number | null>(null)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [loadingDetail, setLoadingDetail] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [keywordTokens, setKeywordTokens] = React.useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = React.useState<string[]>([])
  const [editorKeywords, setEditorKeywords] = React.useState<string[]>([])
  const [isDirty, setIsDirty] = React.useState(false)
  const [backlinkConversationId, setBacklinkConversationId] = React.useState<string | null>(null)
  const [backlinkMessageId, setBacklinkMessageId] = React.useState<string | null>(null)
  const [openingLinkedChat, setOpeningLinkedChat] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const titleInputRef = React.useRef<InputRef | null>(null)
  const message = useAntdMessage()
  const confirmDanger = useConfirmDanger()
  const {
    setHistory,
    setMessages,
    setHistoryId,
    setServerChatId,
    setServerChatState,
    setServerChatTopic,
    setServerChatClusterId,
    setServerChatSource,
    setServerChatExternalRef
  } = useStoreMessageOption()

  const editorDisabled = !isOnline || (!capsLoading && capabilities && !capabilities.hasNotes)

  const scrollToServerCard = useScrollToServerCard("/notes")

  const fetchNotes = async (): Promise<NoteListItem[]> => {
    const q = query.trim()
    const toks = keywordTokens.map((k) => k.toLowerCase())
    // Prefer search when query or keyword filters are present
    if (q || toks.length > 0) {
      const cfg = await (async () => {
        try { return await tldwClient.getConfig() } catch { return null }
      })()
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      const qstr = q || toks.join(' ')
      const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(qstr)}` as any, method: 'GET' as any })
      let arr: any[] = Array.isArray(abs) ? abs : []
      if (toks.length > 0) {
        arr = arr.filter((n) => {
          const hay = `${n?.title || ''} ${n?.content || ''}`.toLowerCase()
          return toks.every((k) => hay.includes(k))
        })
      }
      if (q) {
        const ql = q.toLowerCase()
        arr = arr.filter((n) => (`${n?.title || ''} ${n?.content || ''}`.toLowerCase()).includes(ql))
      }
      setTotal(arr.length)
      return arr
        .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
        .map((n: any) => {
          const links = extractBacklink(n)
          const keywords = extractKeywords(n)
          return {
            id: n?.id,
            title: n?.title,
            content: n?.content,
            updated_at: n?.updated_at,
            conversation_id: links.conversation_id,
            message_id: links.message_id,
            keywords
          }
        })
    }
    // Browse list with pagination when no filters
    const res = await bgRequest<any>({ path: `/api/v1/notes/?page=${page}&results_per_page=${pageSize}` as any, method: 'GET' as any })
    const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
    const pagination = res?.pagination
    setTotal(Number(pagination?.total_items || items.length || 0))
    return items.map((n: any) => {
      const links = extractBacklink(n)
      const keywords = extractKeywords(n)
      return {
        id: n?.id,
        title: n?.title,
        content: n?.content,
        updated_at: n?.updated_at,
        conversation_id: links.conversation_id,
        message_id: links.message_id,
        keywords
      }
    })
  }

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['notes', query, page, pageSize],
    queryFn: fetchNotes,
    placeholderData: keepPreviousData,
    enabled: isOnline
  })

  const filteredCount = Array.isArray(data) ? data.length : 0
  const hasActiveFilters = query.trim().length > 0 || keywordTokens.length > 0

  const loadDetail = React.useCallback(async (id: string | number) => {
    setLoadingDetail(true)
    try {
      const d = await bgRequest<any>({ path: `/api/v1/notes/${id}` as any, method: 'GET' as any })
      setSelectedId(id)
      setTitle(String(d?.title || ''))
      setContent(String(d?.content || ''))
      setEditorKeywords(extractKeywords(d))
      const links = extractBacklink(d)
      setBacklinkConversationId(links.conversation_id)
      setBacklinkMessageId(links.message_id)
      setIsDirty(false)
    } catch {
      message.error('Failed to load note')
    } finally { setLoadingDetail(false) }
  }, [])

  const resetEditor = () => {
    setSelectedId(null)
    setTitle('')
    setContent('')
    setEditorKeywords([])
    setBacklinkConversationId(null)
    setBacklinkMessageId(null)
    setIsDirty(false)
  }

  const confirmDiscardIfDirty = React.useCallback(async () => {
    if (!isDirty) return true
    const ok = await confirmDanger({
      title: 'Discard changes?',
      content: 'You have unsaved changes. Discard them?',
      okText: 'Discard',
      cancelText: 'Cancel'
    })
    return ok
  }, [isDirty])

  const handleNewNote = React.useCallback(async () => {
    const ok = await confirmDiscardIfDirty()
    if (!ok) return
    resetEditor()
    setTimeout(() => {
      titleInputRef.current?.focus()
    }, 0)
  }, [confirmDiscardIfDirty])

  const handleSelectNote = React.useCallback(
    async (id: string | number) => {
      const ok = await confirmDiscardIfDirty()
      if (!ok) return
      await loadDetail(id)
    },
    [confirmDiscardIfDirty, loadDetail]
  )

  const saveNote = async () => {
    if (!content.trim() && !title.trim()) { message.warning('Nothing to save'); return }
    setSaving(true)
    try {
      const metadata: Record<string, any> = { keywords: editorKeywords }
      if (backlinkConversationId) metadata.conversation_id = backlinkConversationId
      if (backlinkMessageId) metadata.message_id = backlinkMessageId
      if (selectedId == null) {
        const payload = { title: title || undefined, content, metadata }
        const created = await bgRequest<any>({ path: '/api/v1/notes/' as any, method: 'POST' as any, headers: { 'Content-Type': 'application/json' }, body: payload })
        message.success('Note created')
        setIsDirty(false)
        await refetch()
        if (created?.id != null) await loadDetail(created.id)
      } else {
        const payload = { title: title || undefined, content, metadata }
        await bgRequest<any>({ path: `/api/v1/notes/${selectedId}` as any, method: 'PUT' as any, headers: { 'Content-Type': 'application/json' }, body: payload })
        message.success('Note updated')
        setIsDirty(false)
        await refetch()
      }
    } catch (e: any) {
      message.error(e?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const deleteNote = async (id?: string | number | null) => {
    const target = id ?? selectedId
    if (target == null) { message.warning('No note selected'); return }
    const ok = await confirmDanger({ title: 'Please confirm', content: 'Delete this note?', okText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    try {
      await bgRequest<any>({ path: `/api/v1/notes/${target}` as any, method: 'DELETE' as any })
      message.success('Note deleted')
      if (selectedId === target) resetEditor()
      await refetch()
    } catch (e: any) {
      message.error(e?.message || 'Delete failed')
    }
  }

  const openLinkedConversation = async () => {
    if (!backlinkConversationId) {
      message.warning(
        t("option:notesSearch.noLinkedConversation", {
          defaultValue: "No linked conversation to open."
        })
      )
      return
    }
    try {
      setOpeningLinkedChat(true)
      await tldwClient.initialize().catch(() => null)
      const chat = await tldwClient.getChat(backlinkConversationId)
      setHistoryId(null)
      setServerChatId(String(backlinkConversationId))
      setServerChatState(
        (chat as any)?.state ??
          (chat as any)?.conversation_state ??
          "in-progress"
      )
      setServerChatTopic((chat as any)?.topic_label ?? null)
      setServerChatClusterId((chat as any)?.cluster_id ?? null)
      setServerChatSource((chat as any)?.source ?? null)
      setServerChatExternalRef((chat as any)?.external_ref ?? null)
      let assistantName = "Assistant"
      if ((chat as any)?.character_id != null) {
        try {
          const c = await tldwClient.getCharacter((chat as any)?.character_id)
          assistantName =
            c?.name || c?.title || c?.slug || assistantName
        } catch {}
      }

      const messages = await tldwClient.listChatMessages(
        backlinkConversationId,
        { include_deleted: "false" } as any
      )
      const historyArr = messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
      const mappedMessages = messages.map((m) => ({
        isBot: m.role === "assistant",
        name:
          m.role === "assistant"
            ? assistantName
            : m.role === "system"
              ? "System"
              : "You",
        message: m.content,
        sources: [],
        images: [],
        serverMessageId: m.id,
        serverMessageVersion: m.version
      }))
      setHistory(historyArr)
      setMessages(mappedMessages)
      updatePageTitle((chat as any)?.title || "")
      navigate("/")
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
        } catch {}
      }, 0)
    } catch (e: any) {
      message.error(
        e?.message ||
          t("option:notesSearch.openConversationError", {
            defaultValue: "Failed to open linked conversation."
          })
      )
    } finally {
      setOpeningLinkedChat(false)
    }
  }

  const copySelected = async () => {
    try {
      await navigator.clipboard.writeText(content || '')
      message.success('Copied')
    } catch { message.error('Copy failed') }
  }

  const exportSelected = () => {
    const name = (title || `note-${selectedId ?? 'new'}`).replace(/[^a-z0-9-_]+/gi, '-')
    const md = title ? `# ${title}\n\n${content || ''}` : (content || '')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAll = async () => {
    try {
      let arr: NoteListItem[] = []
      const q = query.trim()
      const toks = keywordTokens.map((k) => k.toLowerCase())
      if (q || toks.length > 0) {
        const cfg = await tldwClient.getConfig().catch(() => null)
        const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
        const qstr = q || toks.join(' ')
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(qstr)}` as any, method: 'GET' as any })
        let raw: any[] = Array.isArray(abs) ? abs : []
        if (toks.length > 0) {
          raw = raw.filter((n) => {
            const hay = `${n?.title || ''} ${n?.content || ''}`.toLowerCase()
            return toks.every((k) => hay.includes(k))
          })
        }
        if (q) {
          const ql = q.toLowerCase()
          raw = raw.filter((n) => (`${n?.title || ''} ${n?.content || ''}`.toLowerCase()).includes(ql))
        }
        arr = raw.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content }))
      } else {
        // Iterate pages (chunk by 100)
        let p = 1
        const ps = 100
        while (true) {
          const res = await bgRequest<any>({ path: `/api/v1/notes/?page=${p}&results_per_page=${ps}` as any, method: 'GET' as any })
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
          arr.push(...items.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content })))
          const pagination = res?.pagination
          const totalPages = Number(pagination?.total_pages || (items.length < ps ? p : p + 1))
          if (p >= totalPages || items.length === 0) break
          p++
        }
      }
      if (arr.length === 0) { message.info('No notes to export'); return }
      const md = arr.map((n, idx) => `### ${n.title || `Note ${n.id ?? idx+1}`}\n\n${String(n.content || '')}`).join("\n\n---\n\n")
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export.md`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Exported all notes')
    } catch (e: any) {
      message.error(e?.message || 'Export failed')
    }
  }

  const gatherAllMatching = async (): Promise<NoteListItem[]> => {
    let arr: NoteListItem[] = []
    const q = query.trim()
    const toks = keywordTokens.map((k) => k.toLowerCase())
    if (q || toks.length > 0) {
      const cfg = await tldwClient.getConfig().catch(() => null)
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      const qstr = q || toks.join(' ')
      const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(qstr)}` as any, method: 'GET' as any })
      let raw: any[] = Array.isArray(abs) ? abs : []
      if (toks.length > 0) {
        raw = raw.filter((n) => {
          const hay = `${n?.title || ''} ${n?.content || ''}`.toLowerCase()
          return toks.every((k) => hay.includes(k))
        })
      }
      if (q) {
        const ql = q.toLowerCase()
        raw = raw.filter((n) => (`${n?.title || ''} ${n?.content || ''}`.toLowerCase()).includes(ql))
      }
      arr = raw.map((n: any) => ({
        id: n?.id,
        title: n?.title,
        content: n?.content,
        updated_at: n?.updated_at,
        keywords: extractKeywords(n)
      }))
    } else {
      // Iterate pages (chunk by 100)
      let p = 1
      const ps = 100
      while (true) {
        const res = await bgRequest<any>({ path: `/api/v1/notes/?page=${p}&results_per_page=${ps}` as any, method: 'GET' as any })
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
        arr.push(
          ...items.map((n: any) => ({
            id: n?.id,
            title: n?.title,
            content: n?.content,
            updated_at: n?.updated_at,
            keywords: extractKeywords(n)
          }))
        )
        const pagination = res?.pagination
        const totalPages = Number(pagination?.total_pages || (items.length < ps ? p : p + 1))
        if (p >= totalPages || items.length === 0) break
        p++
      }
    }
    return arr
  }

  const exportAllCSV = async () => {
    try {
      const arr = await gatherAllMatching()
      if (!arr.length) { message.info('No notes to export'); return }
      const escape = (s: any) => '"' + String(s ?? '').replace(/"/g, '""') + '"'
      const header = ['id','title','content','updated_at']
      const rows = [header.join(','), ...arr.map(n => [n.id, n.title || '', (n.content || '').replace(/\r?\n/g, '\\n'), n.updated_at || ''].map(escape).join(','))]
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Exported CSV')
    } catch (e: any) {
      message.error(e?.message || 'Export failed')
    }
  }

  const exportAllJSON = async () => {
    try {
      const arr = await gatherAllMatching()
      if (!arr.length) { message.info('No notes to export'); return }
      const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export.json`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Exported JSON')
    } catch (e: any) {
      message.error(e?.message || 'Export failed')
    }
  }

  const loadKeywordSuggestions = React.useCallback(async (text?: string) => {
    try {
      const cfg = await tldwClient.getConfig().catch(() => null)
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      if (text && text.trim().length > 0) {
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/keywords/search/?query=${encodeURIComponent(text)}&limit=10` as any, method: 'GET' as any })
        const arr = Array.isArray(abs) ? abs.map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || "")).filter(Boolean) : []
        setKeywordOptions(arr)
      } else {
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/keywords/?limit=200` as any, method: 'GET' as any })
        const arr = Array.isArray(abs) ? abs.map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || "")).filter(Boolean) : []
        setKeywordOptions(arr)
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  React.useEffect(() => {
    // When selecting a different note, default back to edit mode so users can start typing immediately.
    setShowPreview(false)
  }, [selectedId])

  // Deep-link support: if tldw:lastNoteId is set (e.g., from omni-search),
  // automatically load that note once when the list is available.
  const [pendingNoteId, setPendingNoteId] = React.useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null
      const raw = window.localStorage.getItem("tldw:lastNoteId")
      return raw || null
    } catch {
      return null
    }
  })

  React.useEffect(() => {
    if (!isOnline) return
    if (!pendingNoteId) return
    if (!Array.isArray(data)) return
    if (selectedId != null) return

    ;(async () => {
      await handleSelectNote(pendingNoteId)
      setPendingNoteId(null)
      try {
        window.localStorage.removeItem("tldw:lastNoteId")
      } catch {
        // ignore storage errors
      }
    })()
  }, [data, handleSelectNote, isOnline, pendingNoteId, selectedId])

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 mt-16">
      {/* Left: search + list */}
      <div className="w-full lg:w-1/3 min-w-0 lg:sticky lg:top-16 lg:self-start">
        <NotesToolbar
          query={query}
          total={total}
          visibleCount={filteredCount}
          keywordTokens={keywordTokens}
          keywordOptions={keywordOptions}
          hasActiveFilters={hasActiveFilters}
          onQueryChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          onSubmitSearch={() => {
            setPage(1)
            refetch()
          }}
          onKeywordChange={(vals) => {
            setKeywordTokens(vals)
            setPage(1)
            refetch()
          }}
          onKeywordSearch={(txt) => {
            if (isOnline) void loadKeywordSuggestions(txt)
          }}
          onClearFilters={() => {
            setQuery('')
            setKeywordTokens([])
            setPage(1)
            refetch()
          }}
          onNewNote={() => {
            void handleNewNote()
          }}
        />
        <NotesListPanel
          isOnline={isOnline}
          isFetching={isFetching}
          demoEnabled={demoEnabled}
          capsLoading={capsLoading}
          capabilities={capabilities || null}
          notes={Array.isArray(data) ? data : undefined}
          total={total}
          page={page}
          pageSize={pageSize}
          selectedId={selectedId}
          onSelectNote={(id) => {
            void handleSelectNote(id)
          }}
          onChangePage={(nextPage, nextPageSize) => {
            setPage(nextPage)
            setPageSize(nextPageSize)
          }}
          onResetEditor={resetEditor}
          onScrollToServerCard={scrollToServerCard}
          onOpenHealth={() => navigate('/settings/health')}
          onExportAllMd={() => {
            void exportAll()
          }}
          onExportAllCsv={() => {
            void exportAllCSV()
          }}
          onExportAllJson={() => {
            void exportAllJSON()
          }}
        />
      </div>

        {/* Right: editor */}
        <div
          className="relative flex-1 flex flex-col p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] min-h-[70vh] min-w-0 lg:h-[calc(100dvh-8rem)] overflow-hidden"
          aria-disabled={editorDisabled}
        >
          <NotesEditorHeader
            title={title}
            selectedId={selectedId}
            backlinkConversationId={backlinkConversationId}
            backlinkMessageId={backlinkMessageId}
            editorDisabled={editorDisabled}
            openingLinkedChat={openingLinkedChat}
            showPreview={showPreview}
            hasContent={content.trim().length > 0}
            canSave={
              !editorDisabled &&
              (title.trim().length > 0 || content.trim().length > 0)
            }
            canExport={Boolean(title || content)}
            isSaving={saving}
            canDelete={!editorDisabled && selectedId != null}
            onOpenLinkedConversation={() => {
              void openLinkedConversation()
            }}
            onNewNote={() => {
              void handleNewNote()
            }}
            onTogglePreview={() => {
              setShowPreview((prev) => !prev)
            }}
            onCopy={() => {
              void copySelected()
            }}
            onExport={exportSelected}
            onSave={() => {
              void saveNote()
            }}
            onDelete={() => {
              void deleteNote()
            }}
          />
          <div className="mt-2 flex flex-col flex-1 min-h-0 overflow-auto">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setIsDirty(true)
              }}
              disabled={editorDisabled}
              ref={titleInputRef}
              className="bg-transparent hover:bg-white focus:bg-white dark:bg-transparent dark:hover:bg-[#1f1f1f] dark:focus:bg-[#1f1f1f] transition-colors"
            />
            <div className="mt-2">
              <Select
                mode="tags"
                allowClear
                placeholder="Keywords (tags)"
                className="min-w-[12rem] w-full"
                value={editorKeywords}
                onSearch={(txt) => {
                  if (isOnline) void loadKeywordSuggestions(txt)
                }}
                onChange={(vals) => {
                  setEditorKeywords(vals as string[])
                  setIsDirty(true)
                }}
                options={keywordOptions.map((k) => ({ label: k, value: k }))}
                disabled={editorDisabled}
              />
              <Typography.Text
                type="secondary"
                className="block text-[11px] mt-1"
              >
                {t('option:notesSearch.tagsHelp', {
                  defaultValue:
                    'Keywords help you find this note using the keyword filter on the left.'
                })}
              </Typography.Text>
            </div>
            <div className="mt-2 flex-1 min-h-0">
              {showPreview ? (
                content.trim().length > 0 ? (
                  <div className="h-full flex flex-col">
                    <Typography.Text
                      type="secondary"
                      className="block text-[11px] mb-1"
                    >
                      {t('option:notesSearch.previewTitle', {
                        defaultValue: 'Preview (Markdown + LaTeX)'
                      })}
                    </Typography.Text>
                    <div className="w-full flex-1 text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] overflow-auto">
                      <MarkdownPreview content={content} size="sm" />
                    </div>
                  </div>
                ) : (
                  <Typography.Text
                    type="secondary"
                    className="block text-[11px] mt-1"
                  >
                    {t('option:notesSearch.emptyPreview', {
                      defaultValue:
                        'Start typing to see a live preview of your note.'
                    })}
                  </Typography.Text>
                )
              ) : (
                <textarea
                  className="w-full h-full min-h-0 text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] resize-none leading-relaxed"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder={t('option:notesSearch.editorPlaceholder', {
                    defaultValue: 'Write your note here... (Markdown supported)'
                  })}
                  readOnly={editorDisabled}
                />
              )}
            </div>
          </div>
        </div>
    </div>
  )
}

export default NotesManagerPage
