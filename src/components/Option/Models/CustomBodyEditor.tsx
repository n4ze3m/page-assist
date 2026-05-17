import { Button, Input, InputNumber, Segmented, Tooltip } from "antd"
import { Braces, Hash, Plus, ToggleLeft, Trash2, Type } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

type ValueType = "string" | "number" | "boolean" | "json"

type Row = {
  id: string
  key: string
  type: ValueType
  /** Raw editing value, always kept as a string for input controls. */
  raw: string
}

type Props = {
  /** Controlled JSON string, injected by the parent antd Form.Item. */
  value?: string
  onChange?: (value: string) => void
}

const rowId = () =>
  `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const inferType = (v: any): ValueType => {
  if (typeof v === "number") return "number"
  if (typeof v === "boolean") return "boolean"
  if (v !== null && typeof v === "object") return "json"
  return "string"
}

const toRaw = (v: any, type: ValueType): string => {
  if (type === "json") return JSON.stringify(v, null, 2)
  if (type === "boolean") return v ? "true" : "false"
  return String(v ?? "")
}

/** Parse the stored JSON string into editor rows. */
const parseToRows = (value?: string): Row[] => {
  if (!value || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return []
    }
    return Object.entries(parsed).map(([key, v]) => {
      const type = inferType(v)
      return { id: rowId(), key, type, raw: toRaw(v, type) }
    })
  } catch {
    return []
  }
}

type CoercedRow = { key: string; value: any; error?: boolean }

const coerceRow = (row: Row): CoercedRow => {
  const key = row.key.trim()
  switch (row.type) {
    case "number": {
      if (row.raw.trim() === "") return { key, value: undefined, error: true }
      const n = Number(row.raw)
      return Number.isNaN(n)
        ? { key, value: undefined, error: true }
        : { key, value: n }
    }
    case "boolean":
      return { key, value: row.raw === "true" }
    case "json": {
      if (row.raw.trim() === "") return { key, value: undefined, error: true }
      try {
        return { key, value: JSON.parse(row.raw) }
      } catch {
        return { key, value: undefined, error: true }
      }
    }
    default:
      return { key, value: row.raw }
  }
}

/**
 * Serialize rows to a pretty JSON string. Rows with an empty key or an
 * invalid typed value are omitted (and surfaced inline), so the emitted
 * string is always valid object JSON or "".
 */
const serializeRows = (rows: Row[]): string => {
  const obj: Record<string, any> = {}
  for (const row of rows) {
    const { key, value, error } = coerceRow(row)
    if (!key || error || value === undefined) continue
    obj[key] = value
  }
  if (Object.keys(obj).length === 0) return ""
  return JSON.stringify(obj, null, 2)
}

const TYPE_META: Record<ValueType, { icon: React.ReactNode; label: string }> = {
  string: { icon: <Type className="size-3.5" />, label: "Text" },
  number: { icon: <Hash className="size-3.5" />, label: "Number" },
  boolean: { icon: <ToggleLeft className="size-3.5" />, label: "Boolean" },
  json: { icon: <Braces className="size-3.5" />, label: "JSON" }
}

export const CustomBodyEditor: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation("common")
  const [rows, setRows] = useState<Row[]>(() => parseToRows(value))
  const lastEmitted = useRef<string | undefined>(value)
  // Once the user edits, ignore parent value echoes/refetches so in-progress
  // input is never wiped. Reset only when the parent clears the field.
  const dirty = useRef(false)

  useEffect(() => {
    const norm = (s?: string) => (s == null ? "" : s)
    // Our own emit (including emitting "" when a row is incomplete) — ignore.
    if (norm(value) === norm(lastEmitted.current)) return
    if (!value || !value.trim()) {
      // Genuine external reset (form.resetFields / empty load).
      dirty.current = false
      lastEmitted.current = value
      setRows([])
      return
    }
    if (dirty.current) return
    lastEmitted.current = value
    setRows(parseToRows(value))
  }, [value])

  const emit = (next: string) => {
    lastEmitted.current = next
    onChange?.(next)
  }

  const commitRows = (next: Row[]) => {
    dirty.current = true
    setRows(next)
    emit(serializeRows(next))
  }

  const updateRow = (id: string, patch: Partial<Row>) =>
    commitRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const addRow = () => {
    dirty.current = true
    setRows((prev) => [
      ...prev,
      { id: rowId(), key: "", type: "string", raw: "" }
    ])
  }

  const removeRow = (id: string) =>
    commitRows(rows.filter((r) => r.id !== id))

  const TYPE_ORDER: ValueType[] = ["string", "number", "boolean", "json"]

  const cycleType = (current: ValueType): ValueType =>
    TYPE_ORDER[(TYPE_ORDER.indexOf(current) + 1) % TYPE_ORDER.length]

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const coerced = coerceRow(row)
        const showError = !!row.key.trim() && !!coerced.error
        return (
          <div key={row.id} className="flex flex-col gap-1.5">
            <Input
              placeholder={t("modelSettings.form.customBody.keyPh", {
                defaultValue: "Parameter name"
              })}
              value={row.key}
              onChange={(e) => updateRow(row.id, { key: e.target.value })}
            />
            <div className="flex items-start gap-2">
              <Tooltip
                title={t(`modelSettings.form.customBody.type.${row.type}`, {
                  defaultValue: `${TYPE_META[row.type].label} — click to change`
                })}>
                <Button
                  className="shrink-0"
                  icon={TYPE_META[row.type].icon}
                  onClick={() => {
                    const next = cycleType(row.type)
                    updateRow(row.id, {
                      type: next,
                      raw: next === "boolean" ? "true" : ""
                    })
                  }}
                />
              </Tooltip>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                {row.type === "boolean" ? (
                  <Segmented
                    block
                    value={row.raw === "true" ? "true" : "false"}
                    onChange={(v) => updateRow(row.id, { raw: v as string })}
                    options={[
                      { value: "true", label: "true" },
                      { value: "false", label: "false" }
                    ]}
                  />
                ) : row.type === "number" ? (
                  <InputNumber
                    className="!w-full"
                    status={showError ? "error" : undefined}
                    placeholder="0"
                    value={row.raw === "" ? null : Number(row.raw)}
                    onChange={(v) =>
                      updateRow(row.id, {
                        raw: v === null || v === undefined ? "" : String(v)
                      })
                    }
                  />
                ) : row.type === "json" ? (
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 6 }}
                    status={showError ? "error" : undefined}
                    className="font-mono text-xs"
                    placeholder='{ "type": "enabled" }'
                    value={row.raw}
                    onChange={(e) =>
                      updateRow(row.id, { raw: e.target.value })
                    }
                  />
                ) : (
                  <Input
                    status={showError ? "error" : undefined}
                    placeholder={t("modelSettings.form.customBody.valuePh", {
                      defaultValue: "Value"
                    })}
                    value={row.raw}
                    onChange={(e) =>
                      updateRow(row.id, { raw: e.target.value })
                    }
                  />
                )}
                {showError && (
                  <span className="text-xs text-red-500 dark:text-red-400">
                    {t("modelSettings.form.customBody.rowInvalid", {
                      defaultValue:
                        "Invalid value for this type — excluded until fixed."
                    })}
                  </span>
                )}
              </div>
              <Button
                type="text"
                danger
                aria-label="remove"
                className="shrink-0"
                icon={<Trash2 className="size-4" />}
                onClick={() => removeRow(row.id)}
              />
            </div>
          </div>
        )
      })}

      <Button
        type="dashed"
        block
        icon={<Plus className="size-4" />}
        onClick={addRow}>
        {t("modelSettings.form.customBody.add", {
          defaultValue: "Add parameter"
        })}
      </Button>
    </div>
  )
}
