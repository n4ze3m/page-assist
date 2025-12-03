import React from "react"
import {
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tooltip
} from "antd"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import type {
  ActorAspect,
  ActorSettings,
  ActorSource,
  ActorTarget
} from "@/types/actor"
import {
  ACTOR_ASPECT_SOFT_LIMIT,
  ACTOR_TOKENS_WARNING_THRESHOLD,
  createDefaultActorSettings
} from "@/types/actor"
import { useActorWorldBooks } from "@/hooks/useActorWorldBooks"
import { ActorTokens } from "@/components/Common/Settings/ActorTokens"
import { buildActorDictionaryTokens } from "@/utils/actor"
const Markdown = React.lazy(() => import("@/components/Common/Markdown"))
import { applyActorPresetById } from "@/data/actor-presets"
import type { ActorPresetId } from "@/data/actor-presets"
import { useStorage } from "@plasmohq/storage/hook"

const parseWorldBookEntryOptions = (content: string): string[] => {
  const text = (content || "").trim()
  if (!text) return []
  if (text.includes(",")) {
    return text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  }
  return [text]
}

type Props = {
  form: any
  settings: ActorSettings | null
  setSettings: (next: ActorSettings) => void
  actorPreview: string
  actorTokenCount: number
  onRecompute: () => void
  newAspectTarget: ActorTarget
  setNewAspectTarget: (target: ActorTarget) => void
  newAspectName: string
  setNewAspectName: (val: string) => void
  actorPositionValue?: string
}

type ActorBladeId = "aspects" | "notes" | "placement" | "tokens"

export const ActorEditor: React.FC<Props> = ({
  form,
  settings,
  setSettings,
  actorPreview,
  actorTokenCount,
  onRecompute,
  newAspectTarget,
  setNewAspectTarget,
  newAspectName,
  setNewAspectName,
  actorPositionValue
}) => {
  const { t } = useTranslation(["playground", "common"])
  const {
    worldBooks,
    worldBooksLoading,
    entriesByWorldBook,
    entriesLoading,
    loadEntriesForWorldBook
  } = useActorWorldBooks()
  const [loreWarnings, setLoreWarnings] = React.useState<Record<string, string>>(
    {}
  )
  const [showNotesPreview, setShowNotesPreview] = React.useState(false)
  const [selectedPreset, setSelectedPreset] =
    React.useState<ActorPresetId | null>(null)
  const [activeBlade, setActiveBlade] =
    React.useState<ActorBladeId>("aspects")

  // Currently active assistant/character (from CharacterSelect).
  // Used to label per-character defaults and profiles.
  const [selectedCharacter] = useStorage<any>("selectedCharacter", null)

  React.useEffect(() => {
    if (!settings) return
    for (const aspect of settings.aspects || []) {
      if (aspect.source === "lore" && aspect.lorebookId) {
        void loadEntriesForWorldBook(aspect.lorebookId)
      }
    }
  }, [loadEntriesForWorldBook, settings])

  React.useEffect(() => {
    if (!settings) return
    if (!worldBooks || worldBooksLoading) return

    const worldBookIds = new Set(worldBooks.map((wb) => wb.id))
    const nextWarnings: Record<string, string> = {}
    let changed = false

    const nextAspects: ActorAspect[] = (settings.aspects || []).map(
      (aspect) => {
        if (aspect.source !== "lore") {
          return aspect
        }

        const loreId = aspect.lorebookId
        const entryId = aspect.entryId

        if (!loreId || !worldBookIds.has(loreId)) {
          changed = true
          nextWarnings[aspect.id] = t(
            "playground:composer.actorLoreWorldBookMissing",
            "Previous world book binding was not found; using free text instead."
          )
          return {
            ...aspect,
            source: "free",
            lorebookId: undefined,
            entryId: undefined
          }
        }

        const entries = entriesByWorldBook[loreId]
        if (!entries) {
          return aspect
        }

        const exists = entries.some(
          (entry) => entry.entry_id === String(entryId || "")
        )
        if (!exists && entryId) {
          changed = true
          nextWarnings[aspect.id] = t(
            "playground:composer.actorLoreEntryMissing",
            "Previous world book entry was not found; using free text instead."
          )
          return {
            ...aspect,
            source: "free",
            entryId: undefined
          }
        }

        return aspect
      }
    )

    if (changed) {
      const base = settings ?? createDefaultActorSettings()
      setSettings({
        ...base,
        aspects: nextAspects
      })
      onRecompute()
    }

    setLoreWarnings(nextWarnings)
  }, [
    entriesByWorldBook,
    onRecompute,
    setSettings,
    settings,
    t,
    worldBooks,
    worldBooksLoading
  ])

  const handleRemoveAspect = React.useCallback(
    (aspectId: string) => {
      if (!settings) return
      const next: ActorSettings = {
        ...settings,
        aspects: (settings.aspects || []).filter((a) => a.id !== aspectId)
      }
      setSettings(next)
      form.setFieldsValue({ [`actor_${aspectId}`]: undefined })
      onRecompute()
    },
    [form, onRecompute, setSettings, settings]
  )

  const handleAddAspect = React.useCallback(() => {
    const name = newAspectName.trim()
    if (!settings || !name) return

    const target: ActorTarget = newAspectTarget || "user"
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "aspect"
    const baseId = `${target}_${baseSlug}`

    const existingKeys = new Set((settings.aspects || []).map((a) => a.key))
    let key = baseId
    let suffix = 1
    while (existingKeys.has(key)) {
      suffix += 1
      key = `${baseId}_${suffix}`
    }
    const id = key

    const nextAspect: ActorAspect = {
      id,
      key,
      target,
      name,
      source: "free",
      value: ""
    }

    const base = settings ?? createDefaultActorSettings()
    const next: ActorSettings = {
      ...base,
      aspects: [...(base.aspects || []), nextAspect]
    }

    setSettings(next)
    form.setFieldsValue({ [`actor_${id}`]: "" })
    form.setFieldsValue({ [`actor_key_${id}`]: key })
    setNewAspectName("")
    onRecompute()
  }, [
    form,
    newAspectName,
    newAspectTarget,
    onRecompute,
    setNewAspectName,
    setSettings,
    settings
  ])

  const renderActorAspectField = React.useCallback(
    (aspect: ActorAspect) => {
      const fieldName = `actor_${aspect.id}`
      const keyFieldName = `actor_key_${aspect.id}`
      const currentSource: ActorSource = aspect.source || "free"
      const loreWorldBookId = aspect.lorebookId || ""

      const worldBookOptions =
        worldBooks?.map((wb) => ({
          label: wb.name,
          value: wb.id
        })) || []

      const entries = loreWorldBookId
        ? entriesByWorldBook[loreWorldBookId] || []
        : []

      const entryOptions = entries.map((entry) => ({
        label:
          (entry.keywords && entry.keywords.length
            ? entry.keywords.join(", ")
            : entry.content?.slice(0, 60)) || entry.entry_id,
        value: entry.entry_id
      }))

      const selectedEntry =
        entries.find(
          (entry) => entry.entry_id === String(aspect.entryId || "")
        ) || null

      const valueOptions = selectedEntry
        ? parseWorldBookEntryOptions(selectedEntry.content)
        : []

      const warning = loreWarnings[aspect.id]

      const handleSourceChange = (nextSource: ActorSource) => {
        const base = settings ?? createDefaultActorSettings()
        const aspects = (base.aspects || []).map((a) =>
          a.id === aspect.id
            ? {
                ...a,
                source: nextSource,
                ...(nextSource === "free"
                  ? {
                      lorebookId: undefined,
                      entryId: undefined
                    }
                  : {})
              }
            : a
        )
        setSettings({
          ...base,
          aspects
        })
        onRecompute()
      }

      const handleWorldBookChange = (worldBookId: string) => {
        const id = worldBookId || ""
        const base = settings ?? createDefaultActorSettings()
        const aspects = (base.aspects || []).map((a) =>
          a.id === aspect.id
            ? {
                ...a,
                lorebookId: id || undefined,
                entryId: undefined
              }
            : a
        )
        setSettings({
          ...base,
          aspects
        })
        if (id) {
          void loadEntriesForWorldBook(id)
        }
        form.setFieldsValue({
          [fieldName]: undefined
        })
        onRecompute()
      }

      const handleEntryChange = (entryId: string) => {
        const id = entryId || ""
        const base = settings ?? createDefaultActorSettings()
        const aspects = (base.aspects || []).map((a) =>
          a.id === aspect.id
            ? {
                ...a,
                entryId: id || undefined
              }
            : a
        )
        setSettings({
          ...base,
          aspects
        })

        if (!loreWorldBookId) {
          return
        }

        const entriesForWorldBook = entriesByWorldBook[loreWorldBookId] || []
        const entry =
          entriesForWorldBook.find((e) => e.entry_id === id) || null
        const options = entry ? parseWorldBookEntryOptions(entry.content) : []

        const currentValue = form.getFieldValue(fieldName)
        let nextValue = currentValue
        if (!options.includes(currentValue)) {
          nextValue = options[0] ?? ""
        }
        form.setFieldsValue({
          [fieldName]: nextValue
        })
        onRecompute()
      }

      const handleKeyChange = (val: string) => {
        const currentKey = aspect.key || ""
        const candidate = (val || "").trim() || currentKey
        const normalized =
          candidate
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "") || currentKey

        if (normalized === currentKey) {
          if (candidate !== currentKey) {
            form.setFieldsValue({ [keyFieldName]: currentKey })
          }
          return
        }

        const existingKeys = new Set(
          (settings?.aspects || [])
            .filter((a) => a.id !== aspect.id)
            .map((a) => a.key)
        )
        if (existingKeys.has(normalized)) {
          Modal.error({
            title: t(
              "playground:actor.keyCollisionTitle",
              "Actor key already in use"
            ),
            content: t(
              "playground:actor.keyCollisionBody",
              "Another aspect already uses this key. Keys must be unique per chat."
            ),
            onOk: () => {
              form.setFieldsValue({ [keyFieldName]: currentKey })
            }
          })
          return
        }

        Modal.confirm({
          title: t(
            "playground:actor.keyChangeTitle",
            "Change Actor token key?"
          ),
          content: t(
            "playground:actor.keyChangeBody",
            "This will change the token from {{old}} to {{next}}. Prompts using the old token won't update automatically.",
            {
              old: `[[actor_${currentKey}]]`,
              next: `[[actor_${normalized}]]`
            }
          ),
          okText: t("common:confirm", "Confirm"),
          cancelText: t("common:cancel", "Cancel"),
          onOk: () => {
            const base = settings ?? createDefaultActorSettings()
            const aspects = (base.aspects || []).map((a) =>
              a.id === aspect.id ? { ...a, key: normalized } : a
            )
            setSettings({
              ...base,
              aspects
            })
            form.setFieldsValue({ [keyFieldName]: normalized })
          },
          onCancel: () => {
            form.setFieldsValue({ [keyFieldName]: currentKey })
          }
        })
      }

      return (
        <Form.Item
          key={aspect.id}
          name={fieldName}
          label={
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span>{aspect.name}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      size="small"
                      value={currentSource}
                      style={{ width: 100 }}
                      onChange={(val) =>
                        handleSourceChange(val as ActorSource)
                      }
                      options={[
                        {
                          value: "free",
                          label: t(
                            "playground:composer.actorSourceFree",
                            "Free text"
                          )
                        },
                        {
                          value: "lore",
                          label: t(
                            "playground:composer.actorSourceLore",
                            "World book"
                          )
                        }
                      ]}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRemoveAspect(aspect.id)
                      }}
                      className="ml-1 text-xs text-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t("playground:actor.tokenLabel", "Token")}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      [[actor_
                    </span>
                    <Form.Item
                      name={keyFieldName}
                      noStyle
                      initialValue={aspect.key}>
                      <Input
                        size="small"
                        className="text-[11px] font-mono"
                        onBlur={(e) => handleKeyChange(e.target.value)}
                      />
                    </Form.Item>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      ]]
                    </span>
                  </div>
                </div>
              </div>

              {currentSource === "lore" && (
                <div className="flex flex-col gap-1">
                  <Select
                    size="small"
                    placeholder={t(
                      "playground:composer.actorWorldBookPlaceholder",
                      "World book"
                    )}
                    value={loreWorldBookId || undefined}
                    loading={worldBooksLoading}
                    options={worldBookOptions}
                    onChange={handleWorldBookChange}
                    allowClear
                  />
                  <Select
                    size="small"
                    placeholder={t(
                      "playground:composer.actorEntryPlaceholder",
                      "Entry"
                    )}
                    value={aspect.entryId || undefined}
                    loading={
                      loreWorldBookId
                        ? !!entriesLoading[loreWorldBookId]
                        : false
                    }
                    disabled={!loreWorldBookId || !worldBookOptions.length}
                    options={entryOptions}
                    onChange={handleEntryChange}
                    allowClear
                  />
                </div>
              )}

              {warning && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {warning}
                </div>
              )}
            </div>
          }>
          {currentSource === "lore" ? (
            <Select
              allowClear
              placeholder={t(
                "playground:composer.actorLoreValuePlaceholder",
                "Select an option (optional)"
              )}
              options={valueOptions.map((opt) => ({
                label: opt,
                value: opt
              }))}
              disabled={!selectedEntry || valueOptions.length === 0}
            />
          ) : (
            <Input
              placeholder={t(
                "playground:composer.actorAspectPlaceholder",
                "Describe briefly (optional)"
              )}
            />
          )}
        </Form.Item>
      )
    },
    [
      entriesByWorldBook,
      entriesLoading,
      form,
      loadEntriesForWorldBook,
      loreWarnings,
      onRecompute,
      setSettings,
      settings,
      t,
      worldBooks,
      worldBooksLoading
    ]
  )

  if (!settings) return null

  const notesValue: string = Form.useWatch("actorNotes", form) || ""
  const chatPositionValue: string =
    Form.useWatch("actorChatPosition", form) || settings.chatPosition
  const chatDepthValue: number =
    Form.useWatch("actorChatDepth", form) ?? settings.chatDepth
  const chatRoleValue: string =
    Form.useWatch("actorChatRole", form) || settings.chatRole
  const aspectCount = settings.aspects?.length ?? 0
  const tokensOverLimit = actorTokenCount > ACTOR_TOKENS_WARNING_THRESHOLD
  const actorDictionaryTokens = buildActorDictionaryTokens(settings)

  const aspectsSummary =
    aspectCount === 0
      ? t("playground:actor.summaryAspectsEmpty", "No aspects configured yet.")
      : t(
          "playground:actor.summaryAspectsCount",
          "{{count}} aspects configured.",
          { count: aspectCount }
        )

  const notesSummary =
    notesValue && notesValue.length > 0
      ? t(
          "playground:actor.summaryNotes",
          "{{chars}} characters{{gmSuffix}}.",
          {
            chars: notesValue.length,
            gmSuffix:
              settings.notesGmOnly === true
                ? t("playground:actor.summaryNotesGmOnly", " · GM-only")
                : ""
          }
        )
      : t("playground:actor.summaryNotesEmpty", "No scene notes yet.")

  const placementSummary = (() => {
    if (chatPositionValue === "before") {
      return t(
        "playground:actor.summaryPlacementBefore",
        "Before main prompt/story."
      )
    }
    if (chatPositionValue === "after") {
      return t(
        "playground:actor.summaryPlacementAfter",
        "After main prompt/story."
      )
    }
    // depth
    return t(
      "playground:actor.summaryPlacementDepth",
      "Depth {{depth}} · Role: {{role}}.",
      {
        depth: chatDepthValue,
        role:
          chatRoleValue === "user"
            ? t("playground:composer.actorRoleUser", "User")
            : chatRoleValue === "assistant"
            ? t("playground:composer.actorRoleAssistant", "Assistant")
            : t("playground:composer.actorRoleSystem", "System")
      }
    )
  })()

  const tokensSummary =
    actorDictionaryTokens.length === 0
      ? t(
          "playground:actor.summaryTokensEmpty",
          "No tokens defined yet; set aspect values."
        )
      : t(
          "playground:actor.summaryTokensCount",
          "{{tokens}} tokens · ~{{estimate}} tokens in prompt.",
          {
            tokens: actorDictionaryTokens.length,
            estimate: actorTokenCount
          }
        )

  const renderBladeHeader = (
    id: ActorBladeId,
    title: string,
    summary: string
  ) => {
    const isActive = activeBlade === id
    return (
      <button
        type="button"
        onClick={() => setActiveBlade(id)}
        className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
          isActive
            ? "border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-[#1b1b1b]"
            : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-[#111] dark:hover:bg-[#181818]"
        }`}
        aria-expanded={isActive}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase text-gray-700 dark:text-gray-200">
              {title}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {summary}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {isActive ? "▾" : "▸"}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {renderBladeHeader(
          "aspects",
          t("playground:actor.bladeAspectsTitle", "Aspects"),
          aspectsSummary
        )}
        {renderBladeHeader(
          "notes",
          t("playground:actor.bladeNotesTitle", "Scene notes"),
          notesSummary
        )}
        {renderBladeHeader(
          "placement",
          t("playground:actor.bladePlacementTitle", "Placement & templates"),
          placementSummary
        )}
        {renderBladeHeader(
          "tokens",
          t("playground:actor.bladeTokensTitle", "Tokens & preview"),
          tokensSummary
        )}
      </div>

      {activeBlade === "aspects" && (
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {t(
                "playground:composer.actorAddLabel",
                "Add or remove aspects to focus the scene."
              )}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <Select
                size="small"
                value={newAspectTarget}
                onChange={(val) => setNewAspectTarget(val as ActorTarget)}
                style={{ width: 140 }}
                options={[
                  {
                    value: "user",
                    label: t("playground:composer.actorUser", "User")
                  },
                  {
                    value: "char",
                    label: t("playground:composer.actorChar", "Character")
                  },
                  {
                    value: "world",
                    label: t("playground:composer.actorWorld", "World")
                  }
                ]}
              />
              <Input
                size="small"
                value={newAspectName}
                onChange={(e) => setNewAspectName(e.target.value)}
                placeholder={t(
                  "playground:composer.actorNewAspectPlaceholder",
                  "Aspect name (e.g., Mood, Role, Location)"
                )}
              />
              <button
                type="button"
                onClick={() => handleAddAspect()}
                disabled={!newAspectName.trim()}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-[#2a2a2a] disabled:opacity-50">
                {t("playground:composer.actorAddButton", "Add aspect")}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {t("playground:actor.presetLabel", "Presets")}
              </span>
              <Select
                size="small"
                value={selectedPreset || undefined}
                onChange={(val) => setSelectedPreset(val as ActorPresetId)}
                placeholder={t(
                  "playground:actor.presetPlaceholder",
                  "Choose a preset"
                )}
                style={{ minWidth: 180 }}
                allowClear
                options={[
                  {
                    value: "slice_of_life",
                    label: t(
                      "playground:actor.preset.sliceOfLife",
                      "Slice of life"
                    )
                  },
                  {
                    value: "dungeon_crawl",
                    label: t(
                      "playground:actor.preset.dungeonCrawl",
                      "Dungeon crawl"
                    )
                  },
                  {
                    value: "romance",
                    label: t("playground:actor.preset.romance", "Romance")
                  },
                  {
                    value: "work_session",
                    label: t(
                      "playground:actor.preset.workSession",
                      "Work session"
                    )
                  }
                ]}
              />
              <button
                type="button"
                onClick={() => {
                  if (!selectedPreset || !settings) return
                  const base = settings ?? createDefaultActorSettings()
                  const next = applyActorPresetById(base, selectedPreset)
                  setSettings(next)
                  const fieldValues: Record<string, any> = {
                    actorNotes: next.notes ?? ""
                  }
                  for (const aspect of next.aspects || []) {
                    fieldValues[`actor_${aspect.id}`] = aspect.value ?? ""
                  }
                  form.setFieldsValue(fieldValues)
                  onRecompute()
                }}
                disabled={!selectedPreset}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-[#2a2a2a] disabled:opacity-50">
                {t("playground:actor.applyPreset", "Apply")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = createDefaultActorSettings()
                  setSettings(base)
                  const fieldValues: Record<string, any> = {
                    actorNotes: base.notes ?? "",
                    actorChatPosition: base.chatPosition,
                    actorChatDepth: base.chatDepth,
                    actorChatRole: base.chatRole
                  }
                  for (const aspect of base.aspects || []) {
                    fieldValues[`actor_${aspect.id}`] = aspect.value ?? ""
                    fieldValues[`actor_key_${aspect.id}`] = aspect.key
                  }
                  form.setFieldsValue(fieldValues)
                  onRecompute()
                }}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-[#2a2a2a]">
                {t("playground:actor.resetChat", "Reset for this chat")}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!settings) return
                  const characterId = selectedCharacter?.id
                  if (!characterId) return
                  const { saveActorProfileForCharacter } = await import(
                    "@/services/actor-settings"
                  )
                  await saveActorProfileForCharacter({
                    characterId,
                    settings
                  })
                }}
                disabled={!selectedCharacter?.id}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-[#2a2a2a] disabled:opacity-50">
                {t(
                  "playground:actor.saveAsCharacterDefault",
                  "Save as {{name}}’s default",
                  { name: selectedCharacter?.name || "character" }
                )}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const characterId = selectedCharacter?.id
                  if (!characterId) return
                  const {
                    getActorProfileForCharacter
                  } = await import("@/services/actor-settings")
                  const profile = await getActorProfileForCharacter(characterId)
                  if (!profile) return
                  setSettings(profile)
                  const fieldValues: Record<string, any> = {
                    actorNotes: profile.notes ?? "",
                    actorChatPosition: profile.chatPosition,
                    actorChatDepth: profile.chatDepth,
                    actorChatRole: profile.chatRole
                  }
                  for (const aspect of profile.aspects || []) {
                    fieldValues[`actor_${aspect.id}`] = aspect.value ?? ""
                    fieldValues[`actor_key_${aspect.id}`] = aspect.key
                  }
                  form.setFieldsValue(fieldValues)
                  onRecompute()
                }}
                disabled={!selectedCharacter?.id}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-[#2a2a2a] disabled:opacity-50">
                {t(
                  "playground:actor.applyCharacterDefault",
                  "Apply {{name}}’s default",
                  { name: selectedCharacter?.name || "character" }
                )}
              </button>
            </div>
          </div>

          {!worldBooksLoading && !worldBooks.length && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
              <div className="font-medium">
                {t(
                  "playground:composer.actorOfflineHintTitle",
                  "World Books not available for Actor"
                )}
              </div>
              <div className="mt-0.5">
                {t(
                  "playground:composer.actorOfflineHintBody",
                  "Connect to your tldw server from Settings to use World Books for Actor aspects, or keep using free-text values."
                )}
              </div>
            </div>
          )}

          {aspectCount > ACTOR_ASPECT_SOFT_LIMIT && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
              <div className="font-medium">
                {t(
                  "playground:actor.aspectLimitWarningTitle",
                  "Many aspects configured for this chat"
                )}
              </div>
              <div className="mt-0.5">
                {t(
                  "playground:actor.aspectLimitWarningBody",
                  "You have {{count}} aspects (soft limit {{limit}}). Consider trimming to focus the scene and save tokens.",
                  {
                    count: aspectCount,
                    limit: ACTOR_ASPECT_SOFT_LIMIT
                  }
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t("playground:composer.actorUser", "User")}
              </div>
              {settings.aspects
                .filter((a) => a.target === "user")
                .map((aspect) => renderActorAspectField(aspect))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t("playground:composer.actorChar", "Character")}
              </div>
              {settings.aspects
                .filter((a) => a.target === "char")
                .map((aspect) => renderActorAspectField(aspect))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t("playground:composer.actorWorld", "World")}
              </div>
              {settings.aspects
                .filter((a) => a.target === "world")
                .map((aspect) => renderActorAspectField(aspect))}
            </div>
          </div>
        </div>
      )}

      {activeBlade === "notes" && (
        <div className="space-y-3">
          <Form.Item
            name="actorNotes"
            label={t("playground:composer.actorNotes", "Scene notes")}
            help={t(
              "playground:composer.actorNotesHelp",
              "Optional notes sent to the model. Supports Markdown and LaTeX."
            )}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="actorNotesGmOnly"
            valuePropName="checked"
            className="!-mt-3 mb-2">
            <label className="inline-flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
              <input type="checkbox" className="h-3 w-3" />
              <span>
                {t(
                  "playground:actor.notesGmOnly",
                  "GM-only: do not send notes to the model"
                )}
              </span>
            </label>
          </Form.Item>

          {notesValue && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {t(
                    "playground:actor.notesPreviewTitle",
                    "Scene notes preview"
                  )}
                </span>
                <label className="inline-flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <input
                    type="checkbox"
                    className="h-3 w-3"
                    checked={showNotesPreview}
                    onChange={(e) => setShowNotesPreview(e.target.checked)}
                  />
                  <span>
                    {t(
                      "playground:actor.notesPreviewToggle",
                      "Show Markdown + LaTeX preview"
                    )}
                  </span>
                </label>
              </div>
              {showNotesPreview && (
                <div className="border rounded-md px-2 py-1 bg-gray-50 dark:bg-[#111] max-h-40 overflow-y-auto">
                  <React.Suspense fallback={null}>
                    <Markdown message={notesValue} />
                  </React.Suspense>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeBlade === "placement" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Form.Item
              name="actorChatPosition"
              label={t(
                "playground:composer.actorPosition",
                "Actor prompt position"
              )}
              help={t(
                "playground:composer.actorPositionHelp",
                'Depth is only used when position is "In-chat at depth". Role controls whether Actor appears as system, user, or assistant.'
              )}>
              <Select
                options={[
                  {
                    value: "before",
                    label: t(
                      "playground:composer.actorBefore",
                      "Before main prompt/story"
                    )
                  },
                  {
                    value: "after",
                    label: t(
                      "playground:composer.actorAfter",
                      "After main prompt/story"
                    )
                  },
                  {
                    value: "depth",
                    label: t(
                      "playground:composer.actorDepth",
                      "In-chat at depth"
                    )
                  }
                ]}
              />
            </Form.Item>

            <Form.Item
              name="actorChatDepth"
              label={
                <span className="inline-flex items-center gap-1">
                  {t(
                    "playground:composer.actorDepthLabel",
                    "Depth (non-system messages)"
                  )}
                  <Tooltip
                    title={t(
                      "playground:composer.actorDepthHelp",
                      'Used only when position is "In-chat at depth". Counts non-system messages from the top of the chat.'
                    )}>
                    <span className="text-xs text-gray-400 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </span>
              }
              help={t(
                "playground:actor.depthRangeHelp",
                "Depth must be between 0 and 999; values beyond history length are clamped."
              )}>
              <InputNumber
                min={0}
                max={999}
                style={{ width: "100%" }}
                disabled={actorPositionValue !== "depth"}
                className={actorPositionValue !== "depth" ? "opacity-60" : ""}
                placeholder={t(
                  "playground:composer.actorDepthPlaceholder",
                  "0 = top of chat"
                )}
                controls
              />
            </Form.Item>

            <Form.Item
              name="actorChatRole"
              label={t(
                "playground:composer.actorRoleLabel",
                "Actor message role"
              )}>
              <Select
                options={[
                  {
                    value: "system",
                    label: t(
                      "playground:composer.actorRoleSystem",
                      "System"
                    )
                  },
                  {
                    value: "user",
                    label: t("playground:composer.actorRoleUser", "User")
                  },
                  {
                    value: "assistant",
                    label: t(
                      "playground:composer.actorRoleAssistant",
                      "Assistant"
                    )
                  }
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="actorTemplateMode"
            label={t(
              "playground:actor.templateModeLabel",
              "Scene template interaction"
            )}
            help={t(
              "playground:actor.templateModeHelp",
              "Controls how Actor interacts with active scene templates. Merge keeps both; Override lets Actor replace overlapping fields; Ignore skips Actor when templates are active."
            )}>
            <Select
              options={[
                {
                  value: "merge",
                  label: t(
                    "playground:actor.templateMode.merge",
                    "Merge with templates"
                  )
                },
                {
                  value: "override",
                  label: t(
                    "playground:actor.templateMode.override",
                    "Override templates"
                  )
                },
                {
                  value: "ignore",
                  label: t(
                    "playground:actor.templateMode.ignore",
                    "Ignore when templates active"
                  )
                }
              ]}
            />
          </Form.Item>
        </div>
      )}

      {activeBlade === "tokens" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t(
                  "playground:composer.actorPreview",
                  "Actor prompt preview"
                )}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t(
                  "playground:composer.actorTokens",
                  "Tokens: {{count}}",
                  {
                    count: actorTokenCount
                  }
                )}
              </span>
            </div>
            {tokensOverLimit && (
              <div className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                {t(
                  "playground:actor.tokenWarning",
                  "Actor prompt is long ({{count}} tokens; soft limit {{limit}}). Consider trimming aspects or notes to save context.",
                  {
                    count: actorTokenCount,
                    limit: ACTOR_TOKENS_WARNING_THRESHOLD
                  }
                )}
              </div>
            )}
            <div className="border rounded-md px-2 py-1 bg-gray-50 dark:bg-[#111] max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs text-gray-800 dark:text-gray-100">
                {actorPreview ||
                  t(
                    "playground:composer.actorPreviewEmpty",
                    "Nothing to send yet."
                  )}
              </pre>
            </div>
          </div>

          <ActorTokens settings={settings} />
        </div>
      )}

      <Divider />
    </div>
  )
}
