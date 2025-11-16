import React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message
} from "antd"
import { Checkbox } from "antd"
import { useTranslation } from "react-i18next"
import { confirmDanger } from "@/components/Common/confirm-danger"
import { useServerOnline } from "@/hooks/useServerOnline"
import {
  createDeck,
  createFlashcard,
  deleteFlashcard,
  getFlashcard,
  getFlashcardsImportLimits,
  importFlashcards,
  listDecks,
  listFlashcards,
  reviewFlashcard,
  updateFlashcard,
  type Deck,
  type Flashcard,
  type FlashcardCreate,
  type FlashcardUpdate,
  exportFlashcards,
  exportFlashcardsFile
} from "@/services/flashcards"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useNavigate } from "react-router-dom"

const { Text, Title } = Typography

type DueStatus = "new" | "learning" | "due" | "all"

export const FlashcardsPage: React.FC = () => {
  const { t } = useTranslation(["option", "common"]) // keys use defaultValue fallbacks
  const isOnline = useServerOnline()
  const qc = useQueryClient()
  const navigate = useNavigate()

  if (!isOnline) {
    return (
      <FeatureEmptyState
        title={t("option:flashcards.emptyConnectTitle", {
          defaultValue: "Connect to use Flashcards"
        })}
        description={t("option:flashcards.emptyConnectDescription", {
          defaultValue:
            "To review or generate flashcards, first connect to your tldw server."
        })}
        examples={[
          t("option:flashcards.emptyConnectExample1", {
            defaultValue:
              "Go to Settings → tldw server to add your server URL."
          }),
          t("option:flashcards.emptyConnectExample2", {
            defaultValue:
              "Once connected, review due cards or create new decks from your notes and media."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
  }

  // Shared: decks
  const decksQuery = useQuery({
    queryKey: ["flashcards:decks"],
    queryFn: listDecks,
    enabled: isOnline
  })

  // REVIEW TAB STATE
  const [reviewDeckId, setReviewDeckId] = React.useState<number | null | undefined>(undefined)
  const [showAnswer, setShowAnswer] = React.useState(false)
  const [answerMs, setAnswerMs] = React.useState<number | undefined>(undefined)

  const reviewQuery = useQuery({
    queryKey: ["flashcards:review:next", reviewDeckId],
    queryFn: async (): Promise<Flashcard | null> => {
      // Fetch next due from chosen deck; order by due_at, limit 1
      const res = await listFlashcards({
        deck_id: reviewDeckId ?? undefined,
        due_status: "due",
        order_by: "due_at",
        limit: 1,
        offset: 0
      })
      return res.items?.[0] || null
    },
    enabled: isOnline
  })

  const onSubmitReview = async (rating: number) => {
    try {
      const card = reviewQuery.data
      if (!card) return
      await reviewFlashcard({ card_uuid: card.uuid, rating, answer_time_ms: answerMs })
      setShowAnswer(false)
      setAnswerMs(undefined)
      await qc.invalidateQueries({ queryKey: ["flashcards:review:next"] })
      message.success(t("common:success", { defaultValue: "Success" }))
    } catch (e: any) {
      message.error(e?.message || "Failed to submit review")
    }
  }

  // CREATE TAB STATE
  const [createForm] = Form.useForm<FlashcardCreate>()
  const createMutation = useMutation({
    mutationKey: ["flashcards:create"],
    mutationFn: (payload: FlashcardCreate) => createFlashcard(payload),
    onSuccess: () => {
      message.success(t("common:created", { defaultValue: "Created" }))
      createForm.resetFields()
      qc.invalidateQueries({ queryKey: ["flashcards:list"] })
    },
    onError: (e: any) => message.error(e?.message || "Create failed")
  })
  const [newDeckModalOpen, setNewDeckModalOpen] = React.useState(false)
  const [newDeckName, setNewDeckName] = React.useState("")
  const [newDeckDesc, setNewDeckDesc] = React.useState("")
  const createDeckMutation = useMutation({
    mutationKey: ["flashcards:deck:create"],
    mutationFn: () => createDeck({ name: newDeckName.trim(), description: newDeckDesc.trim() || undefined }),
    onSuccess: async (deck) => {
      message.success(t("common:created", { defaultValue: "Created" }))
      setNewDeckModalOpen(false)
      setNewDeckName("")
      setNewDeckDesc("")
      await qc.invalidateQueries({ queryKey: ["flashcards:decks"] })
      // set deck in form
      createForm.setFieldsValue({ deck_id: deck.id })
    },
    onError: (e: any) => message.error(e?.message || "Failed to create deck")
  })

  // MANAGE TAB STATE
  const [mDeckId, setMDeckId] = React.useState<number | null | undefined>(undefined)
  const [mQuery, setMQuery] = React.useState("")
  const [mTag, setMTag] = React.useState<string | undefined>(undefined)
  const [mDue, setMDue] = React.useState<DueStatus>("all")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [previewOpen, setPreviewOpen] = React.useState<Set<string>>(new Set())
  const [selectAllAcross, setSelectAllAcross] = React.useState<boolean>(false)
  const [deselectedIds, setDeselectedIds] = React.useState<Set<string>>(new Set())

  const manageQuery = useQuery({
    queryKey: ["flashcards:list", mDeckId, mQuery, mTag, mDue, page, pageSize],
    queryFn: async () =>
      await listFlashcards({
        deck_id: mDeckId ?? undefined,
        q: mQuery || undefined,
        tag: mTag || undefined,
        due_status: mDue,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        order_by: "due_at"
      }),
    enabled: isOnline
  })

  const toggleSelect = (uuid: string, checked: boolean) => {
    if (selectAllAcross) {
      setDeselectedIds((prev) => {
        const next = new Set(prev)
        if (checked) next.delete(uuid)
        else next.add(uuid)
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (checked) next.add(uuid)
        else next.delete(uuid)
        return next
      })
    }
  }
  const selectAllOnPage = () => {
    const ids = (manageQuery.data?.items || []).map((i) => i.uuid)
    setSelectAllAcross(false)
    setSelectedIds(new Set([...(selectedIds || new Set()), ...ids]))
    setDeselectedIds(new Set())
  }
  const clearSelection = () => { setSelectedIds(new Set()); setSelectAllAcross(false); setDeselectedIds(new Set()) }
  const selectAllAcrossResults = () => { setSelectAllAcross(true); setDeselectedIds(new Set()); setSelectedIds(new Set()) }
  const togglePreview = (uuid: string) => {
    setPreviewOpen((prev) => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  // Selection across results helpers
  const totalCount = manageQuery.data?.count || 0
  const selectedCount = selectAllAcross ? Math.max(0, totalCount - deselectedIds.size) : selectedIds.size

  async function fetchAllItemsAcrossFilters(): Promise<Flashcard[]> {
    const items: Flashcard[] = []
    const maxPerPage = 1000
    const total = totalCount
    for (let offset = 0; offset < total; offset += maxPerPage) {
      const res = await listFlashcards({
        deck_id: mDeckId ?? undefined,
        q: mQuery || undefined,
        tag: mTag || undefined,
        due_status: mDue,
        limit: maxPerPage,
        offset,
        order_by: "due_at"
      })
      items.push(...(res.items || []))
      if (!res.items || res.items.length < maxPerPage) break
    }
    return items
  }

  async function getSelectedItems(): Promise<Flashcard[]> {
    if (!selectAllAcross) {
      const onPage = manageQuery.data?.items || []
      return onPage.filter((i) => selectedIds.has(i.uuid))
    }
    const all = await fetchAllItemsAcrossFilters()
    return all.filter((i) => !deselectedIds.has(i.uuid))
  }

  // Edit modal
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Flashcard | null>(null)
  const [editForm] = Form.useForm<FlashcardUpdate & { tags_text?: string[] }>()

  // Quick actions: review
  const [quickReviewOpen, setQuickReviewOpen] = React.useState(false)
  const [quickReviewCard, setQuickReviewCard] = React.useState<Flashcard | null>(null)
  const openQuickReview = async (card: Flashcard) => {
    try { const full = await getFlashcard(card.uuid); setQuickReviewCard(full); setQuickReviewOpen(true) } catch (e: any) { message.error(e?.message || 'Failed to load card') }
  }
  const submitQuickRating = async (rating: number) => {
    try {
      if (!quickReviewCard) return
      await reviewFlashcard({ card_uuid: quickReviewCard.uuid, rating })
      setQuickReviewOpen(false)
      setQuickReviewCard(null)
      await qc.invalidateQueries({ queryKey: ["flashcards:list"] })
      message.success(t("common:success", { defaultValue: "Success" }))
    } catch (e: any) { message.error(e?.message || 'Review failed') }
  }

  // Quick actions: duplicate
  const duplicateCard = async (card: Flashcard) => {
    try {
      const full = await getFlashcard(card.uuid)
      await createFlashcard({
        deck_id: full.deck_id ?? undefined,
        front: full.front,
        back: full.back,
        notes: full.notes || undefined,
        extra: full.extra || undefined,
        is_cloze: full.is_cloze,
        tags: full.tags || undefined,
        model_type: full.model_type,
        reverse: full.reverse
      })
      await qc.invalidateQueries({ queryKey: ["flashcards:list"] })
      message.success(t("common:created", { defaultValue: "Created" }))
    } catch (e: any) { message.error(e?.message || 'Duplicate failed') }
  }

  // Quick actions: move (change deck)
  const [moveOpen, setMoveOpen] = React.useState(false)
  const [moveCard, setMoveCard] = React.useState<Flashcard | null>(null)
  const [moveDeckId, setMoveDeckId] = React.useState<number | null>(null)
  const openMove = async (card: Flashcard) => {
    try { const full = await getFlashcard(card.uuid); setMoveCard(full); setMoveDeckId(full.deck_id ?? null); setMoveOpen(true) } catch (e: any) { message.error(e?.message || 'Failed to load card') }
  }
  const submitMove = async () => {
    try {
      if (moveCard) {
        const full = await getFlashcard(moveCard.uuid)
        await updateFlashcard(moveCard.uuid, { deck_id: moveDeckId ?? null, expected_version: full.version })
      } else {
        // bulk move
        const items = manageQuery.data?.items || []
        const toMove = items.filter((i) => selectedIds.has(i.uuid))
        await Promise.all(
          toMove.map((i) => updateFlashcard(i.uuid, { deck_id: moveDeckId ?? null, expected_version: i.version }))
        )
        clearSelection()
      }
      setMoveOpen(false)
      setMoveCard(null)
      await qc.invalidateQueries({ queryKey: ["flashcards:list"] })
      message.success(t("common:updated", { defaultValue: "Updated" }))
    } catch (e: any) { message.error(e?.message || 'Move failed') }
  }

  const openEdit = async (card: Flashcard) => {
    try {
      const full = await getFlashcard(card.uuid)
      setEditing(full)
      editForm.setFieldsValue({
        deck_id: full.deck_id ?? undefined,
        front: full.front,
        back: full.back,
        notes: full.notes || undefined,
        extra: full.extra || undefined,
        is_cloze: full.is_cloze,
        tags: full.tags || undefined,
        model_type: full.model_type,
        reverse: full.reverse,
        expected_version: full.version
      } as any)
      setEditOpen(true)
    } catch (e: any) {
      message.error(e?.message || "Failed to load card")
    }
  }

  const doUpdate = async () => {
    try {
      if (!editing) return
      const values = (await editForm.validateFields()) as FlashcardUpdate
      await updateFlashcard(editing.uuid, values)
      message.success(t("common:updated", { defaultValue: "Updated" }))
      setEditOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["flashcards:list"] })
    } catch (e: any) {
      if (e?.errorFields) return // form validation error
      message.error(e?.message || "Update failed")
    }
  }

  const doDelete = async () => {
    try {
      if (!editing) return
      const expected = editForm.getFieldValue("expected_version") as number | undefined
      if (typeof expected !== "number") {
        message.error("Missing version; reload and try again")
        return
      }
      await deleteFlashcard(editing.uuid, expected)
      message.success(t("common:deleted", { defaultValue: "Deleted" }))
      setEditOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["flashcards:list"] })
    } catch (e: any) {
      message.error(e?.message || "Delete failed")
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      {!isOnline && (
        <Alert type="warning" showIcon message={t("common:serverOffline", { defaultValue: "Server offline or not configured" })} className="mb-4" />
      )}
      <Tabs
        defaultActiveKey="review"
        items={[
          {
            key: "review",
            label: t("option:flashcards.review", { defaultValue: "Review" }),
            children: (
              <div>
                <Space wrap className="mb-3">
                  <Select
                    placeholder={t("option:flashcards.selectDeck", { defaultValue: "Select deck (optional)" })}
                    allowClear
                    loading={decksQuery.isLoading}
                    value={reviewDeckId as any}
                    className="min-w-64"
                    onChange={(v) => setReviewDeckId(v)}
                    options={(decksQuery.data || []).map((d) => ({ label: d.name, value: d.id }))}
                  />
                  <Button onClick={() => qc.invalidateQueries({ queryKey: ["flashcards:review:next"] })} loading={reviewQuery.isFetching}>
                    {t("option:flashcards.nextDue", { defaultValue: "Next due" })}
                  </Button>
                </Space>
                {reviewQuery.data ? (
                  <Card>
                    <div className="flex flex-col gap-3">
                      <div>
                        <Tag>{reviewQuery.data.model_type}{reviewQuery.data.reverse ? " • reverse" : ""}</Tag>
                        {reviewQuery.data.tags?.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                      <div>
                        <Title level={5} className="!mb-2">{t("option:flashcards.front", { defaultValue: "Front" })}</Title>
                        <div className="whitespace-pre-wrap border rounded p-3 bg-white dark:bg-[#111]">{reviewQuery.data.front}</div>
                      </div>
                      {showAnswer && (
                        <div>
                          <Title level={5} className="!mb-2">{t("option:flashcards.back", { defaultValue: "Back" })}</Title>
                          <div className="whitespace-pre-wrap border rounded p-3 bg-white dark:bg-[#111]">{reviewQuery.data.back}</div>
                          {reviewQuery.data.extra && (
                            <div className="mt-2 text-sm opacity-80 whitespace-pre-wrap">{reviewQuery.data.extra}</div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {!showAnswer ? (
                          <Button type="primary" onClick={() => setShowAnswer(true)}>
                            {t("option:flashcards.showAnswer", { defaultValue: "Show Answer" })}
                          </Button>
                        ) : (
                          <>
                            <Text className="mr-2">{t("option:flashcards.rate", { defaultValue: "Rate" })}:</Text>
                            {[0,1,2,3,4,5].map((r) => (
                              <Button key={r} onClick={() => onSubmitReview(r)}>{r}</Button>
                            ))}
                            <Input
                              className="ml-2 w-40"
                              type="number"
                              placeholder={t("option:flashcards.answerMs", { defaultValue: "Answer ms (opt)" })}
                              value={typeof answerMs === 'number' ? String(answerMs) : ''}
                              onChange={(e) => setAnswerMs(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Empty description={t("option:flashcards.noDue", { defaultValue: "No due cards" })} />
                )}
              </div>
            )
          },
          {
            key: "create",
            label: t("option:flashcards.create", { defaultValue: "Create" }),
            children: (
              <div className="max-w-3xl">
                <Form form={createForm} layout="vertical" initialValues={{ is_cloze: false, model_type: "basic", reverse: false }}>
                  <Space align="end" className="mb-2">
                    <Form.Item name="deck_id" label={t("option:flashcards.deck", { defaultValue: "Deck" })} className="!mb-0">
                      <Select
                        placeholder={t("option:flashcards.selectDeck", { defaultValue: "Select deck" })}
                        allowClear
                        loading={decksQuery.isLoading}
                        className="min-w-64"
                        options={(decksQuery.data || []).map((d) => ({ label: d.name, value: d.id }))}
                      />
                    </Form.Item>
                    <Button onClick={() => setNewDeckModalOpen(true)}>
                      {t("option:flashcards.newDeck", { defaultValue: "New Deck" })}
                    </Button>
                  </Space>
                  <Form.Item name="model_type" label={t("option:flashcards.modelType", { defaultValue: "Model Type" })}>
                    <Select
                      options={[
                        { label: "basic", value: "basic" },
                        { label: "basic_reverse", value: "basic_reverse" },
                        { label: "cloze", value: "cloze" }
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="reverse" label={t("option:flashcards.reverse", { defaultValue: "Reverse" })} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="is_cloze" label={t("option:flashcards.isCloze", { defaultValue: "Is Cloze" })} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="tags" label={t("option:flashcards.tags", { defaultValue: "Tags" })}>
                    <Select mode="tags" placeholder="tag1, tag2" open={false} allowClear />
                  </Form.Item>
                  <Form.Item name="front" label={t("option:flashcards.front", { defaultValue: "Front" })} rules={[{ required: true }]}> <Input.TextArea rows={3} /></Form.Item>
                  <Form.Item name="back" label={t("option:flashcards.back", { defaultValue: "Back" })} rules={[{ required: true }]}> <Input.TextArea rows={6} /></Form.Item>
                  <Form.Item name="extra" label={t("option:flashcards.extra", { defaultValue: "Extra" })}> <Input.TextArea rows={3} /></Form.Item>
                  <Form.Item name="notes" label={t("option:flashcards.notes", { defaultValue: "Notes" })}> <Input.TextArea rows={2} /></Form.Item>
                  <Space>
                    <Button type="primary" onClick={() => {
                      createForm
                        .validateFields()
                        .then((values) => createMutation.mutate(values))
                        .catch(() => {})
                    }} loading={createMutation.isPending}>
                      {t("common:create", { defaultValue: "Create" })}
                    </Button>
                    <Button onClick={() => createForm.resetFields()}>{t("common:reset", { defaultValue: "Reset" })}</Button>
                  </Space>
                </Form>

                <Modal
                  title={t("option:flashcards.newDeck", { defaultValue: "New Deck" })}
                  open={newDeckModalOpen}
                  onCancel={() => setNewDeckModalOpen(false)}
                  onOk={() => createDeckMutation.mutate()}
                  okText={t("common:create", { defaultValue: "Create" })}
                  confirmLoading={createDeckMutation.isPending}
                >
                  <Space direction="vertical" className="w-full">
                    <Input placeholder="Name" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} />
                    <Input.TextArea placeholder="Description (optional)" value={newDeckDesc} onChange={(e) => setNewDeckDesc(e.target.value)} />
                  </Space>
                </Modal>
              </div>
            )
          },
          {
            key: "manage",
            label: t("option:flashcards.manage", { defaultValue: "Manage" }),
            children: (
              <div>
                <Space wrap className="mb-3">
                  <Input.Search
                    placeholder={t("common:search", { defaultValue: "Search" })}
                    allowClear
                    onSearch={() => qc.invalidateQueries({ queryKey: ["flashcards:list"] })}
                    value={mQuery}
                    onChange={(e) => setMQuery(e.target.value)}
                    className="min-w-64"
                  />
                  <Select
                    placeholder={t("option:flashcards.deck", { defaultValue: "Deck" })}
                    allowClear
                    loading={decksQuery.isLoading}
                    value={mDeckId as any}
                    onChange={(v) => setMDeckId(v)}
                    className="min-w-56"
                    options={(decksQuery.data || []).map((d) => ({ label: d.name, value: d.id }))}
                  />
                  <Select
                    placeholder={t("option:flashcards.dueStatus", { defaultValue: "Due status" })}
                    value={mDue}
                    onChange={(v: DueStatus) => setMDue(v)}
                    options={[
                      { label: "all", value: "all" },
                      { label: "new", value: "new" },
                      { label: "learning", value: "learning" },
                      { label: "due", value: "due" }
                    ]}
                  />
                  <Input
                    placeholder={t("option:flashcards.tag", { defaultValue: "Tag" })}
                    value={mTag}
                    onChange={(e) => setMTag(e.target.value || undefined)}
                    className="min-w-44"
                  />
                </Space>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Text type="secondary">{t("option:flashcards.selectedCount", { defaultValue: "Selected" })}: {selectedCount}{selectAllAcross ? ` / ${totalCount}` : ''}</Text>
                  <Button size="small" onClick={selectAllOnPage}>{t("option:flashcards.selectAllOnPage", { defaultValue: "Select all on page" })}</Button>
                  <Button size="small" onClick={selectAllAcrossResults}>{t("option:flashcards.selectAllAcross", { defaultValue: "Select all across results" })}</Button>
                  <Button size="small" onClick={clearSelection}>{t("option:flashcards.clearSelection", { defaultValue: "Clear selection" })}</Button>
                  <Button size="small" disabled={selectedIds.size === 0} onClick={() => setMoveOpen(true)}>
                    {t("option:flashcards.bulkMove", { defaultValue: "Bulk Move" })}
                  </Button>
                  <Button danger size="small" disabled={selectedIds.size === 0} onClick={async () => {
                    const toDelete = await getSelectedItems()
                    if (!toDelete.length) return
                    const ok = await confirmDanger({
							title: t('common:confirmTitle', { defaultValue: 'Please confirm' }),
							content: t('option:flashcards.bulkDeleteConfirm', { defaultValue: t('common:delete', { defaultValue: 'Delete' }) + ` ${toDelete.length}?` }),
							okText: t('common:delete', { defaultValue: 'Delete' }),
							cancelText: t('common:cancel', { defaultValue: 'Cancel' })
						})
                    if (!ok) return
                    try {
                      await Promise.all(toDelete.map((i) => deleteFlashcard(i.uuid, i.version)))
                      message.success(t("common:deleted", { defaultValue: "Deleted" }))
                      clearSelection()
                      await qc.invalidateQueries({ queryKey: ["flashcards:list"] })
                    } catch (e: any) { message.error(e?.message || 'Bulk delete failed') }
                  }}>
                    {t("option:flashcards.bulkDelete", { defaultValue: "Bulk Delete" })}
                  </Button>
                  <Button size="small" disabled={selectedIds.size === 0} onClick={() => {
                    (async () => {
                      try {
                        const items = await getSelectedItems()
                      const header = ['Deck','Front','Back','Tags','Notes']
                      const decks = decksQuery.data || []
                      const nameById = new Map<number, string>()
                      decks.forEach((d) => nameById.set(d.id, d.name))
                      const rows = items.map((i) => [
                        i.deck_id != null ? (nameById.get(i.deck_id) || `Deck ${i.deck_id}`) : '',
                        i.front || '',
                        i.back || '',
                        Array.isArray(i.tags) ? i.tags.join(' ') : '',
                        i.notes || ''
                      ].join('\t'))
                      const text = [header.join('\t'), ...rows].join('\n')
                      const blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'flashcards-selected.tsv'
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                      } catch (e: any) { message.error(e?.message || 'Export failed') }
                    })()
                  }}>
                    {t("option:flashcards.exportSelectedCsv", { defaultValue: "Export selected (CSV/TSV)" })}
                  </Button>
                </div>
                <List
                  loading={manageQuery.isFetching}
                  dataSource={manageQuery.data?.items || []}
                  locale={{ emptyText: <Empty description={t("option:flashcards.noCards", { defaultValue: "No cards" })} /> }}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Checkbox key="sel" checked={selectAllAcross ? !deselectedIds.has(item.uuid) : selectedIds.has(item.uuid)} onChange={(e) => toggleSelect(item.uuid, e.target.checked)} />,
                        <Button key="preview" size="small" onClick={() => togglePreview(item.uuid)}>
                          {previewOpen.has(item.uuid) ? t("option:flashcards.hideAnswer", { defaultValue: "Hide Answer" }) : t("option:flashcards.showAnswer", { defaultValue: "Show Answer" })}
                        </Button>,
                        <Button key="review" size="small" onClick={() => openQuickReview(item)}>{t("option:flashcards.review", { defaultValue: "Review" })}</Button>,
                        <Button key="duplicate" size="small" onClick={() => duplicateCard(item)}>{t("option:flashcards.duplicate", { defaultValue: "Duplicate" })}</Button>,
                        <Button key="move" size="small" onClick={() => openMove(item)}>{t("option:flashcards.move", { defaultValue: "Move" })}</Button>,
                        <Button key="edit" size="small" onClick={() => openEdit(item)}>{t("common:edit", { defaultValue: "Edit" })}</Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div className="flex items-center gap-2">
                            <Text strong>{item.front.slice(0, 80)}</Text>
                            <span className="text-gray-400">→</span>
                            <Text type="secondary">{item.back.slice(0, 80)}</Text>
                          </div>
                        }
                        description={
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.deck_id != null && (
                              <Tag color="blue">{(decksQuery.data || []).find((d) => d.id === item.deck_id)?.name || `Deck ${item.deck_id}`}</Tag>
                            )}
                            <Tag>{item.model_type}{item.reverse ? " • reverse" : ""}</Tag>
                            {(item.tags || []).map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))}
                            {item.due_at && <Tag color="green">{t("option:flashcards.due", { defaultValue: "Due" })}: {new Date(item.due_at).toLocaleString()}</Tag>}
                          </div>
                        }
                      />
                      {previewOpen.has(item.uuid) && (
                        <div className="mt-2">
                          <div className="whitespace-pre-wrap border rounded p-2 bg-white dark:bg-[#111]">{item.back}</div>
                          {item.extra && <div className="opacity-80 text-xs whitespace-pre-wrap mt-1">{item.extra}</div>}
                        </div>
                      )}
                    </List.Item>
                  )}
                />
                <div className="mt-3 flex justify-end">
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    onChange={(p, ps) => {
                      setPage(p)
                      setPageSize(ps)
                    }}
                    total={manageQuery.data?.count || 0}
                    showSizeChanger
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                </div>

                <Modal
                  title={t("option:flashcards.review", { defaultValue: "Review" })}
                  open={quickReviewOpen}
                  onCancel={() => { setQuickReviewOpen(false); setQuickReviewCard(null) }}
                  footer={null}
                >
                  {quickReviewCard && (
                    <div className="flex flex-col gap-3">
                      <div className="whitespace-pre-wrap border rounded p-3">{quickReviewCard.front}</div>
                      <div className="whitespace-pre-wrap border rounded p-3">{quickReviewCard.back}</div>
                      {quickReviewCard.extra && <div className="opacity-80 text-sm whitespace-pre-wrap">{quickReviewCard.extra}</div>}
                      <div className="flex gap-2">
                        {[0,1,2,3,4,5].map((r) => (
                          <Button key={r} onClick={() => submitQuickRating(r)}>{r}</Button>
                        ))}
                      </div>
                    </div>
                  )}
                </Modal>

                <Modal
                  title={moveCard ? t("option:flashcards.deck", { defaultValue: "Deck" }) : t("option:flashcards.bulkMove", { defaultValue: "Bulk Move" })}
                  open={moveOpen}
                  onCancel={() => { setMoveOpen(false); setMoveCard(null) }}
                  onOk={submitMove}
                >
                  <Select
                    className="w-full"
                    allowClear
                    loading={decksQuery.isLoading}
                    value={moveDeckId as any}
                    onChange={(v) => setMoveDeckId(v)}
                    options={(decksQuery.data || []).map((d) => ({ label: d.name, value: d.id }))}
                  />
                </Modal>

                <Modal
                  title={t("option:flashcards.editCard", { defaultValue: "Edit Card" })}
                  open={editOpen}
                  onCancel={() => { setEditOpen(false); setEditing(null) }}
                  onOk={doUpdate}
                  okText={t("common:save", { defaultValue: "Save" })}
                  okButtonProps={{ loading: false }}
                  footer={(_, { OkBtn, CancelBtn }) => (
                    <div className="flex w-full justify-between">
                      <Button danger onClick={doDelete}>{t("common:delete", { defaultValue: "Delete" })}</Button>
                      <Space>
                        <CancelBtn />
                        <OkBtn />
                      </Space>
                    </div>
                  )}
                >
                  <Form form={editForm} layout="vertical">
                    <Form.Item name="deck_id" label={t("option:flashcards.deck", { defaultValue: "Deck" })}>
                      <Select
                        allowClear
                        loading={decksQuery.isLoading}
                        options={(decksQuery.data || []).map((d) => ({ label: d.name, value: d.id }))}
                      />
                    </Form.Item>
                    <Form.Item name="model_type" label={t("option:flashcards.modelType", { defaultValue: "Model Type" })}>
                      <Select
                        options={[
                          { label: "basic", value: "basic" },
                          { label: "basic_reverse", value: "basic_reverse" },
                          { label: "cloze", value: "cloze" }
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="reverse" label={t("option:flashcards.reverse", { defaultValue: "Reverse" })} valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="is_cloze" label={t("option:flashcards.isCloze", { defaultValue: "Is Cloze" })} valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="tags" label={t("option:flashcards.tags", { defaultValue: "Tags" })}>
                      <Select mode="tags" open={false} allowClear />
                    </Form.Item>
                    <Form.Item name="front" label={t("option:flashcards.front", { defaultValue: "Front" })} rules={[{ required: true }]}> <Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="back" label={t("option:flashcards.back", { defaultValue: "Back" })} rules={[{ required: true }]}> <Input.TextArea rows={6} /></Form.Item>
                    <Form.Item name="extra" label={t("option:flashcards.extra", { defaultValue: "Extra" })}> <Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="notes" label={t("option:flashcards.notes", { defaultValue: "Notes" })}> <Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="expected_version" hidden>
                      <Input type="number" />
                    </Form.Item>
                  </Form>
                </Modal>
              </div>
            )
          }
          ,
          {
            key: "importExport",
            label: t("option:flashcards.importExport", { defaultValue: "Import / Export" }),
            children: (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Import */}
                <Card title={t("option:flashcards.importTitle", { defaultValue: "Import Flashcards" })}>
                  <ImportPanel />
                </Card>
                {/* Export */}
                <Card title={t("option:flashcards.exportTitle", { defaultValue: "Export Flashcards" })}>
                  <ExportPanel />
                </Card>
              </div>
            )
          }
        ]}
      />
    </div>
  )
}

export default FlashcardsPage

// --- Import Panel ---
const ImportPanel: React.FC = () => {
  const { t } = useTranslation(["option", "common"]) 
  const isOnline = useServerOnline()
  const [content, setContent] = React.useState("")
  const [delimiter, setDelimiter] = React.useState<string>("\t")
  const [hasHeader, setHasHeader] = React.useState<boolean>(false)

  const limitsQuery = useQuery({
    queryKey: ["flashcards:import:limits"],
    queryFn: getFlashcardsImportLimits,
    enabled: isOnline
  })

  // Column mapping (optional)
  const [useMapping, setUseMapping] = React.useState<boolean>(false)
  const [colCount, setColCount] = React.useState<number>(0)
  const [mapping, setMapping] = React.useState<{ deck: number; front: number; back: number; tags?: number; notes?: number } | null>(null)

  React.useEffect(() => {
    const lines = (content || '').split(/\r?\n/).filter((l) => l.trim().length)
    const first = lines[0]
    if (!first) { setColCount(0); setMapping(null); return }
    const cols = first.split(delimiter || '\t')
    setColCount(cols.length)
    setMapping((m) => m || ({ deck: 0, front: Math.min(1, cols.length-1), back: Math.min(2, cols.length-1), tags: cols.length > 3 ? 3 : undefined, notes: cols.length > 4 ? 4 : undefined }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, delimiter])

  const buildMappedTSV = React.useCallback(() => {
    if (!useMapping || !mapping) return content
    const rows = (content || '').split(/\r?\n/)
    const out: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i]
      if (!raw.trim()) continue
      if (i === 0 && hasHeader) continue
      const cols = raw.split(delimiter || '\t')
      const safe = (idx?: number) => (typeof idx === 'number' && idx >= 0 && idx < cols.length ? cols[idx] : '')
      const deck = safe(mapping.deck)
      const front = safe(mapping.front)
      const back = safe(mapping.back)
      const tags = safe(mapping.tags)
      const notes = safe(mapping.notes)
      out.push([deck, front, back, tags, notes].join('\t'))
    }
    return out.join('\n')
  }, [content, delimiter, hasHeader, mapping, useMapping])

  const importMutation = useMutation({
    mutationKey: ["flashcards:import"],
    mutationFn: () => {
      const mapped = buildMappedTSV()
      const payload = useMapping ? { content: mapped, delimiter: '\\t', has_header: false } : { content, delimiter, has_header: hasHeader }
      return importFlashcards(payload as any)
    },
    onSuccess: () => {
      message.success(t("option:flashcards.imported", { defaultValue: "Imported" }))
      setContent("")
    },
    onError: (e: any) => message.error(e?.message || "Import failed")
  })

  return (
    <div className="flex flex-col gap-3">
      {!isOnline && (
        <Alert type="warning" showIcon message={t("common:serverOffline", { defaultValue: "Server offline or not configured" })} />
      )}
      <Text type="secondary">
        {t("option:flashcards.importHelp", { defaultValue: "Paste TSV/CSV lines: Deck, Front, Back, Tags, Notes" })}
      </Text>
      <Input.TextArea
        rows={10}
        placeholder={t("option:flashcards.pasteContent", { defaultValue: "Paste content here..." })}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Space>
        <Select
          value={delimiter}
          onChange={setDelimiter}
          options={[
            { label: t("option:flashcards.tab", { defaultValue: "Tab" }), value: "\t" },
            { label: t("option:flashcards.comma", { defaultValue: ", (Comma)" }), value: "," },
            { label: t("option:flashcards.semicolon", { defaultValue: "; (Semicolon)" }), value: ";" },
            { label: t("option:flashcards.pipe", { defaultValue: "| (Pipe)" }), value: "|" }
          ]}
        />
        <Space>
          <Text>{t("option:flashcards.hasHeader", { defaultValue: "Has header" })}</Text>
          <Switch checked={hasHeader} onChange={setHasHeader} />
        </Space>
      </Space>
      <div className="flex items-center gap-2">
        <Button
          type="primary"
          disabled={!content.trim()}
          loading={importMutation.isPending}
          onClick={() => importMutation.mutate()}
        >
          {t("option:flashcards.import", { defaultValue: "Import" })}
        </Button>
        {limitsQuery.data && (
          <Tooltip
            title={
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(limitsQuery.data, null, 2)}</pre>
            }
          >
            <Text type="secondary" className="cursor-help">
              {t("option:flashcards.importLimits", { defaultValue: "Import Limits" })}
            </Text>
          </Tooltip>
        )}
      </div>
      <Space align="center">
        <Text>{t("option:flashcards.importTitle", { defaultValue: "Import" })} mapping</Text>
        <Switch checked={useMapping} onChange={setUseMapping} />
      </Space>
      {useMapping && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Text type="secondary">{t("option:flashcards.deck", { defaultValue: "Deck" })}</Text>
            <Select className="w-full" value={mapping?.deck} onChange={(v) => setMapping((m) => ({ ...(m as any), deck: v }))} options={Array.from({ length: colCount }, (_, i) => ({ label: `Col ${i+1}`, value: i }))} />
          </div>
          <div>
            <Text type="secondary">{t("option:flashcards.front", { defaultValue: "Front" })}</Text>
            <Select className="w-full" value={mapping?.front} onChange={(v) => setMapping((m) => ({ ...(m as any), front: v }))} options={Array.from({ length: colCount }, (_, i) => ({ label: `Col ${i+1}`, value: i }))} />
          </div>
          <div>
            <Text type="secondary">{t("option:flashcards.back", { defaultValue: "Back" })}</Text>
            <Select className="w-full" value={mapping?.back} onChange={(v) => setMapping((m) => ({ ...(m as any), back: v }))} options={Array.from({ length: colCount }, (_, i) => ({ label: `Col ${i+1}`, value: i }))} />
          </div>
          <div>
            <Text type="secondary">{t("option:flashcards.tags", { defaultValue: "Tags" })}</Text>
            <Select className="w-full" allowClear value={mapping?.tags} onChange={(v) => setMapping((m) => ({ ...(m as any), tags: v }))} options={Array.from({ length: colCount }, (_, i) => ({ label: `Col ${i+1}`, value: i }))} />
          </div>
          <div>
            <Text type="secondary">{t("option:flashcards.notes", { defaultValue: "Notes" })}</Text>
            <Select className="w-full" allowClear value={mapping?.notes} onChange={(v) => setMapping((m) => ({ ...(m as any), notes: v }))} options={Array.from({ length: colCount }, (_, i) => ({ label: `Col ${i+1}`, value: i }))} />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Export Panel ---
const ExportPanel: React.FC = () => {
  const { t } = useTranslation(["option", "common"]) 
  const isOnline = useServerOnline()
  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ["flashcards:decks"],
    queryFn: listDecks,
    enabled: isOnline
  })

  const [deckId, setDeckId] = React.useState<number | undefined>(undefined)
  const [query, setQuery] = React.useState<string>("")
  const [tag, setTag] = React.useState<string>("")
  const [format, setFormat] = React.useState<"csv" | "apkg">("csv")
  const [includeReverse, setIncludeReverse] = React.useState<boolean>(false)
  const [delimiter, setDelimiter] = React.useState<string>("\t")
  const [includeHeader, setIncludeHeader] = React.useState<boolean>(false)
  const [extendedHeader, setExtendedHeader] = React.useState<boolean>(false)
  const [downloading, setDownloading] = React.useState<boolean>(false)

  const doExport = async () => {
    try {
      setDownloading(true)
      let blob: Blob
      if (format === 'apkg') {
        blob = await exportFlashcardsFile({
          deck_id: deckId ?? null,
          q: query || null,
          tag: tag || null,
          format: 'apkg',
          include_reverse: includeReverse,
          delimiter,
          include_header: includeHeader,
          extended_header: extendedHeader
        })
      } else {
        const text = await exportFlashcards({
          deck_id: deckId ?? null,
          q: query || null,
          tag: tag || null,
          format,
          include_reverse: includeReverse,
          delimiter,
          include_header: includeHeader,
          extended_header: extendedHeader
        })
        blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'csv' ? 'flashcards.csv' : 'flashcards.apkg'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      message.error(e?.message || "Export failed")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!isOnline && (
        <Alert type="warning" showIcon message={t("common:serverOffline", { defaultValue: "Server offline or not configured" })} />
      )}
      <Space wrap>
        <Select
          placeholder={t("option:flashcards.deck", { defaultValue: "Deck" })}
          allowClear
          loading={decksLoading}
          value={deckId as any}
          onChange={(v) => setDeckId(v)}
          className="min-w-56"
          options={(decks || []).map((d) => ({ label: d.name, value: d.id }))}
        />
        <Input
          placeholder={t("option:flashcards.tag", { defaultValue: "Tag" })}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="min-w-40"
        />
        <Input
          placeholder={t("common:search", { defaultValue: "Search" })}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-56"
        />
        <Select
          value={format}
          onChange={(v) => setFormat(v)}
          options={[
            { label: t("option:flashcards.csv", { defaultValue: "CSV/TSV" }), value: "csv" },
            { label: t("option:flashcards.apkg", { defaultValue: "Anki (.apkg)" }), value: "apkg" }
          ]}
        />
      </Space>
      <Space wrap>
        <Space>
          <Text>{t("option:flashcards.includeReverse", { defaultValue: "Include reverse" })}</Text>
          <Switch checked={includeReverse} onChange={setIncludeReverse} />
        </Space>
        <Select
          value={delimiter}
          onChange={setDelimiter}
          options={[
            { label: t("option:flashcards.tab", { defaultValue: "Tab" }), value: "\t" },
            { label: t("option:flashcards.comma", { defaultValue: ", (Comma)" }), value: "," },
            { label: t("option:flashcards.semicolon", { defaultValue: "; (Semicolon)" }), value: ";" },
            { label: t("option:flashcards.pipe", { defaultValue: "| (Pipe)" }), value: "|" }
          ]}
        />
        <Space>
          <Text>{t("option:flashcards.includeHeader", { defaultValue: "Include header" })}</Text>
          <Switch checked={includeHeader} onChange={setIncludeHeader} />
        </Space>
        <Space>
          <Text>{t("option:flashcards.extendedHeader", { defaultValue: "Extended header" })}</Text>
          <Switch checked={extendedHeader} onChange={setExtendedHeader} />
        </Space>
      </Space>
      <div>
        <Button type="primary" onClick={doExport} loading={downloading}>
          {t("option:flashcards.download", { defaultValue: "Download" })}
        </Button>
      </div>
    </div>
  )
}
