import React from "react"
import { Button, Drawer, Form, Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { useMessageOption } from "@/hooks/useMessageOption"
import type { ActorSettings, ActorTarget } from "@/types/actor"
import { createDefaultActorSettings } from "@/types/actor"
import {
  getActorSettingsForChatWithCharacterFallback,
  saveActorSettingsForChat
} from "@/services/actor-settings"
import {
  buildActorPrompt,
  buildActorSettingsFromForm,
  estimateActorTokens
} from "@/utils/actor"
import { ActorEditor } from "@/components/Common/Settings/ActorEditor"
import { useActorStore } from "@/store/actor"
import type { Character } from "@/types/character"
import { useStorage } from "@plasmohq/storage/hook"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const ActorPopout: React.FC<Props> = ({ open, setOpen }) => {
  const { t } = useTranslation(["playground", "common"])
  const { historyId, serverChatId } = useMessageOption()
  const [selectedCharacter] = useStorage<Character | null>(
    "selectedCharacter",
    null
  )
  const [form] = Form.useForm()
  const {
    settings,
    setSettings,
    preview,
    tokenCount,
    setPreviewAndTokens
  } = useActorStore()
  const [loading, setLoading] = React.useState(false)
  const [newAspectTarget, setNewAspectTarget] =
    React.useState<ActorTarget>("user")
  const [newAspectName, setNewAspectName] = React.useState("")
  const actorPositionValue = Form.useWatch("actorChatPosition", form)
  const hydratedRef = React.useRef(false)
  const timeoutRef = React.useRef<number | undefined>()

  const hydrate = React.useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const actor = await getActorSettingsForChatWithCharacterFallback({
        historyId,
        serverChatId,
        characterId: selectedCharacter?.id ?? null
      })
      setSettings(actor)

      const baseFields: Record<string, any> = {
        actorEnabled: actor.isEnabled,
        actorNotes: actor.notes,
        actorNotesGmOnly: actor.notesGmOnly ?? false,
        actorChatPosition: actor.chatPosition,
        actorChatDepth: actor.chatDepth,
        actorChatRole: actor.chatRole,
        actorTemplateMode: actor.templateMode ?? "merge"
      }
      for (const aspect of actor.aspects || []) {
        baseFields[`actor_${aspect.id}`] = aspect.value
        baseFields[`actor_key_${aspect.id}`] = aspect.key
      }
      form.setFieldsValue(baseFields)

      const text = buildActorPrompt(actor)
      setPreviewAndTokens(text, estimateActorTokens(text))
    } finally {
      setLoading(false)
    }
  }, [
    form,
    historyId,
    selectedCharacter?.id,
    serverChatId,
    setPreviewAndTokens,
    setSettings
  ])

  React.useEffect(() => {
    if (open && !hydratedRef.current) {
      hydratedRef.current = true
      void hydrate()
    }
    if (!open) {
      hydratedRef.current = false
    }
  }, [open, hydrate])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const recompute = React.useCallback(() => {
    const base = settings ?? createDefaultActorSettings()
    const values = form.getFieldsValue()

    const next: ActorSettings = buildActorSettingsFromForm(base, values)

    const text = buildActorPrompt(next)
    setPreviewAndTokens(text, estimateActorTokens(text))
  }, [form, setPreviewAndTokens, settings])

  const debouncedRecompute = React.useMemo(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        recompute()
      }, 150)
    }
  }, [recompute])

  const handleSave = async (values: any) => {
    const base = settings ?? createDefaultActorSettings()
    const next: ActorSettings = buildActorSettingsFromForm(base, values)
    setSettings(next)
    await saveActorSettingsForChat({
      historyId,
      serverChatId,
      settings: next
    })
    setOpen(false)
  }

  return (
    <Drawer
      placement="right"
      width={420}
      open={open}
      onClose={() => setOpen(false)}
      title={t("playground:composer.actorTitle", "Scene Director (Actor)")}>
      {loading || !settings ? (
        <Skeleton active />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          onValuesChange={(changed) => {
            const keys = Object.keys(changed || {})
            const shouldUpdate = keys.some(
              (k) =>
                k === "actorEnabled" ||
                k === "actorNotes" ||
                k === "actorNotesGmOnly" ||
                k === "actorChatPosition" ||
                k === "actorChatDepth" ||
                k === "actorChatRole" ||
                k.startsWith("actor_")
            )
            if (shouldUpdate) {
              debouncedRecompute()
            }
          }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {t(
                    "playground:composer.actorTitle",
                    "Scene Director (Actor)"
                  )}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    "playground:composer.actorHelp",
                    "Configure per-chat scene context: roles, mood, world, goals, and notes."
                  )}
                </span>
              </div>
              <Form.Item
                name="actorEnabled"
                valuePropName="checked"
                className="mb-0">
                <Switch />
              </Form.Item>
            </div>

            <ActorEditor
              form={form}
              settings={settings}
              setSettings={setSettings}
              actorPreview={preview}
              actorTokenCount={tokenCount}
              onRecompute={recompute}
              newAspectTarget={newAspectTarget}
              setNewAspectTarget={setNewAspectTarget}
              newAspectName={newAspectName}
              setNewAspectName={setNewAspectName}
              actorPositionValue={actorPositionValue}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>
                {t("common:cancel", "Cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {t("common:save", "Save")}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Drawer>
  )
}
