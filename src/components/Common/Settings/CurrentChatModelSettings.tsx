import { getPromptById } from "@/db/dexie/helpers"
import { useMessageOption } from "@/hooks/useMessageOption"
import { FileIcon, X } from "lucide-react"
import { getAllModelSettings } from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"
import { useActorStore } from "@/store/actor"
import { useQuery } from "@tanstack/react-query"
import {
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  notification,
  Select,
  Skeleton,
  Switch,
  Tooltip
} from "antd"
import React, { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SaveButton } from "../SaveButton"
import { getOCRLanguage } from "@/services/ocr"
import { ocrLanguages } from "@/data/ocr-language"
import { fetchChatModels } from "@/services/tldw-server"
import { ProviderIcons } from "@/components/Common/ProviderIcon"
import { tldwClient } from "@/services/tldw/TldwApiClient"
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
import type { Character } from "@/types/character"
import { useStorage } from "@plasmohq/storage/hook"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
  useDrawer?: boolean
  isOCREnabled?: boolean
}

export const CurrentChatModelSettings = ({
  open,
  setOpen,
  useDrawer,
  isOCREnabled
}: Props) => {
  const { t } = useTranslation("common")
  const [form] = Form.useForm()
  const cUserSettings = useStoreChatModelSettings()
  const {
    historyId,
    selectedSystemPrompt,
    uploadedFiles,
    removeUploadedFile,
    selectedModel,
    setSelectedModel,
    fileRetrievalEnabled,
    setFileRetrievalEnabled,
    serverChatId,
    serverChatTopic,
    setServerChatTopic,
    serverChatState,
    setServerChatState
  } = useMessageOption()

  const [selectedCharacter] = useStorage<Character | null>(
    "selectedCharacter",
    null
  )

  const {
    settings: actorSettings,
    setSettings: setActorSettings,
    preview: actorPreview,
    tokenCount: actorTokenCount,
    setPreviewAndTokens
  } = useActorStore()
  const [newAspectTarget, setNewAspectTarget] =
    React.useState<ActorTarget>("user")
  const [newAspectName, setNewAspectName] = React.useState<string>("")
  const actorPositionValue = Form.useWatch("actorChatPosition", form)

  const conversationStateOptions: { value: string; label: string }[] = useMemo(
    () => [
      {
        value: "in-progress",
        label: t("playground:composer.state.inProgress", "in-progress") as string
      },
      {
        value: "resolved",
        label: t("playground:composer.state.resolved", "resolved") as string
      },
      {
        value: "backlog",
        label: t("playground:composer.state.backlog", "backlog") as string
      },
      {
        value: "non-viable",
        label: t("playground:composer.state.nonViable", "non-viable") as string
      }
    ],
    [t]
  )

  const savePrompt = useCallback(
    (value: string) => {
      cUserSettings.setX("systemPrompt", value)
    },
    [cUserSettings]
  )

  const recomputeActorPreview = useCallback(() => {
    const values = form.getFieldsValue()
    const base = actorSettings ?? createDefaultActorSettings()

    const next: ActorSettings = buildActorSettingsFromForm(base, values)

    const preview = buildActorPrompt(next)
    setPreviewAndTokens(preview, estimateActorTokens(preview))
  }, [actorSettings, form, setPreviewAndTokens])

  const timeoutRef = React.useRef<number | undefined>()

  const debouncedRecomputeActorPreview = React.useMemo(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        recomputeActorPreview()
      }, 150)
    }
  }, [recomputeActorPreview])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    recomputeActorPreview()
  }, [actorSettings, open, recomputeActorPreview])

  const saveSettings = useCallback(
    (values: any) => {
      Object.entries(values).forEach(([key, value]) => {
        if (
          key !== "systemPrompt" &&
          key !== "ocrLanguage" &&
          key !== "actorEnabled" &&
          key !== "actorNotes" &&
          key !== "actorNotesGmOnly" &&
          key !== "actorChatPosition" &&
          key !== "actorChatDepth" &&
          key !== "actorChatRole" &&
          !key.startsWith("actor_")
        ) {
          cUserSettings.setX(key, value)
        }
      })

      const base = actorSettings ?? createDefaultActorSettings()
      const next: ActorSettings = buildActorSettingsFromForm(base, values)

      setActorSettings(next)
      void saveActorSettingsForChat({
        historyId,
        serverChatId,
        settings: next
      })
    },
    [actorSettings, cUserSettings, historyId, serverChatId]
  )

  const { isPending: isLoading } = useQuery({
    queryKey: ["fetchModelConfig2", open],
    queryFn: async () => {
      const data = await getAllModelSettings()

      const ocrLang = await getOCRLanguage()

      if (isOCREnabled) {
        cUserSettings.setOcrLanguage(ocrLang)
      }
      let tempSystemPrompt = ""

      // i hate this method but i need this feature so badly that i need to do this
      if (selectedSystemPrompt) {
        const prompt = await getPromptById(selectedSystemPrompt)
        tempSystemPrompt = prompt?.content ?? ""
      }

      const baseValues: Record<string, any> = {
        temperature: cUserSettings.temperature ?? data.temperature,
        topK: cUserSettings.topK ?? data.topK,
        topP: cUserSettings.topP ?? data.topP,
        keepAlive: cUserSettings.keepAlive ?? data.keepAlive,
        numCtx: cUserSettings.numCtx ?? data.numCtx,
        seed: cUserSettings.seed,
        numGpu: cUserSettings.numGpu ?? data.numGpu,
        numPredict: cUserSettings.numPredict ?? data.numPredict,
        systemPrompt: cUserSettings.systemPrompt ?? tempSystemPrompt,
        useMMap: cUserSettings.useMMap ?? data.useMMap,
        minP: cUserSettings.minP ?? data.minP,
        repeatLastN: cUserSettings.repeatLastN ?? data.repeatLastN,
        repeatPenalty: cUserSettings.repeatPenalty ?? data.repeatPenalty,
        useMlock: cUserSettings.useMlock ?? data.useMlock,
        tfsZ: cUserSettings.tfsZ ?? data.tfsZ,
        numKeep: cUserSettings.numKeep ?? data.numKeep,
        numThread: cUserSettings.numThread ?? data.numThread,
        reasoningEffort: cUserSettings?.reasoningEffort,
        thinking: cUserSettings?.thinking
      }

      const actor =
        actorSettings ??
        (await getActorSettingsForChatWithCharacterFallback({
          historyId,
          serverChatId,
          characterId: selectedCharacter?.id ?? null
        }))
      setActorSettings(actor)

      const actorFields: Record<string, any> = {
        actorEnabled: actor.isEnabled,
        actorNotes: actor.notes,
        actorNotesGmOnly: actor.notesGmOnly ?? false,
        actorChatPosition: actor.chatPosition,
        actorChatDepth: actor.chatDepth,
        actorChatRole: actor.chatRole,
        actorTemplateMode: actor.templateMode ?? "merge"
      }
      for (const aspect of actor.aspects || []) {
        actorFields[`actor_${aspect.id}`] = aspect.value
        actorFields[`actor_key_${aspect.id}`] = aspect.key
      }

      form.setFieldsValue({
        ...baseValues,
        ...actorFields
      })

      const preview = buildActorPrompt(actor)
      setPreviewAndTokens(preview, estimateActorTokens(preview))
      return data
    },
    enabled: open,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })

  const { data: composerModels, isLoading: modelsLoading } = useQuery({
    queryKey: ["playground:chatModels", open],
    queryFn: async () => {
      try {
        return await fetchChatModels({ returnEmpty: true })
      } catch (error) {
        console.error("Failed to fetch chat models:", error)
        throw error
      }
    },
    enabled: open,
    retry: 2
  })

  const modelOptions = useMemo(() => {
    const providerDisplayName = (provider?: string) => {
      const key = String(provider || "unknown").toLowerCase()
      if (key === "openai") return "OpenAI"
      if (key === "anthropic") return "Anthropic"
      if (key === "google") return "Google"
      if (key === "mistral") return "Mistral"
      if (key === "cohere") return "Cohere"
      if (key === "groq") return "Groq"
      if (key === "huggingface") return "HuggingFace"
      if (key === "openrouter") return "OpenRouter"
      if (key === "ollama") return "Ollama"
      if (key === "llama") return "Llama.cpp"
      if (key === "kobold") return "Kobold.cpp"
      if (key === "ooba") return "Oobabooga"
      if (key === "tabby") return "TabbyAPI"
      if (key === "vllm") return "vLLM"
      if (key === "aphrodite") return "Aphrodite"
      if (key === "zai") return "Z.AI"
      if (key === "custom_openai_api") return "Custom OpenAI API"
      return provider || "API"
    }

    type GroupOption = {
      label: React.ReactNode
      options: Array<{
        label: React.ReactNode
        value: string
        searchLabel: string
      }>
    }
    const models = (composerModels as any[]) || []
    if (!models.length) {
      if (selectedModel) {
        const displayText = `Custom - ${selectedModel}`
        const fallbackGroup: GroupOption = {
          label: (
            <span className="truncate">
              Custom
            </span>
          ),
          options: [
            {
              label: (
                <span className="truncate">
                  {displayText}
                </span>
              ),
              value: selectedModel,
              searchLabel: displayText.toLowerCase()
            }
          ]
        }
        return [fallbackGroup]
      }
      return []
    }

    const groups = new Map<string, GroupOption>()

    for (const m of models as any[]) {
      const rawProvider = (m.details && m.details.provider) || m.provider
      const providerKey = String(rawProvider || "other").toLowerCase()
      const providerLabel = providerDisplayName(rawProvider)
      const modelLabel = m.nickname || m.model
      const details: any = m.details || {}
      const caps: string[] = Array.isArray(details.capabilities)
        ? details.capabilities
        : []
      const hasVision = caps.includes("vision")
      const hasTools = caps.includes("tools")
      const hasFast = caps.includes("fast")

      const optionDisplay = `${providerLabel} - ${modelLabel}`
      const optionLabel = (
        <div className="flex items-center gap-2" data-title={`${providerLabel} - ${modelLabel}`}>
          <ProviderIcons provider={rawProvider} className="h-4 w-4" />
          <div className="flex flex-col min-w-0">
            <span className="truncate">{optionDisplay}</span>
            {(hasVision || hasTools || hasFast) && (
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                {hasVision && (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100">
                    Vision
                  </span>
                )}
                {hasTools && (
                  <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-100">
                    Tools
                  </span>
                )}
                {hasFast && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
                    Fast
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )

      if (!groups.has(providerKey)) {
        groups.set(providerKey, {
          label: (
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <ProviderIcons provider={rawProvider} className="h-3 w-3" />
              <span>{providerLabel}</span>
            </div>
          ),
          options: []
        })
      }
      const group = groups.get(providerKey)!
      group.options.push({
        label: optionLabel,
        value: m.model,
        searchLabel: optionDisplay.toLowerCase()
      })
    }

    const groupedOptions: GroupOption[] = Array.from(groups.values())

    if (selectedModel) {
      const hasSelected = groupedOptions.some((group) =>
        group.options.some((option) => option.value === selectedModel)
      )

      if (!hasSelected) {
        const displayText = `Custom - ${selectedModel}`
        groupedOptions.push({
          label: (
            <span className="truncate">
              Custom
            </span>
          ),
          options: [
            {
              label: (
                <span className="truncate">
                  {displayText}
                </span>
              ),
              value: selectedModel,
              searchLabel: displayText.toLowerCase()
            }
          ]
        })
      }
    }

    return groupedOptions
  }, [composerModels, selectedModel])

  const renderBody = () => {
    return (
      <>
        {!isLoading ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              saveSettings(values)
              setOpen(false)
            }}
            onValuesChange={(changedValues) => {
              const keys = Object.keys(changedValues || {})
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
                debouncedRecomputeActorPreview()
              }
            }}>
            {useDrawer && (
              <>
                <Form.Item
                  name="systemPrompt"
                  help={t("modelSettings.form.systemPrompt.help")}
                  label={t("modelSettings.form.systemPrompt.label")}>
                  <div className="space-y-1">
                    <Input.TextArea
                      rows={4}
                      placeholder={t(
                        "modelSettings.form.systemPrompt.placeholder"
                      )}
                      onChange={(e) => savePrompt(e.target.value)}
                    />
                    {selectedSystemPrompt && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:border-blue-500/40 dark:bg-blue-900/20 dark:text-blue-100">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>
                          {t(
                            "playground:composer.sceneTemplateActive",
                            "Scene template active: Actor respects template interaction settings."
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </Form.Item>
                <Divider />
              </>
            )}

            {isOCREnabled && (
              <div className="flex flex-col space-y-2 mb-3">
                <span className="text-gray-700   dark:text-neutral-50">
                  OCR Language
                </span>

                <Select
                  showSearch
                  style={{ width: "100%" }}
                  options={ocrLanguages}
                  value={cUserSettings.ocrLanguage}
                  filterOption={(input, option) =>
                    option!.label.toLowerCase().indexOf(input.toLowerCase()) >=
                      0 ||
                    option!.value.toLowerCase().indexOf(input.toLowerCase()) >=
                      0
                  }
                  onChange={(value) => {
                    cUserSettings.setOcrLanguage(value)
                  }}
                />
                <Divider />

              </div>
            )}

            <Form.Item
              label={t("modelSettings.form.model.label", { defaultValue: "API / model" })}
              help={t("modelSettings.form.model.help", { defaultValue: "Choose the API/model used for this chat." })}>
              <Select
                showSearch
                value={selectedModel || undefined}
                onChange={(value) => setSelectedModel(value)}
                placeholder={t("playground:composer.modelPlaceholder", "API / model")}
                options={modelOptions as any}
                loading={modelsLoading}
                allowClear
                optionLabelProp="label"
                popupMatchSelectWidth={false}
                styles={{
                  popup: {
                    root: {
                      maxHeight: "calc(100vh - 220px)",
                      overflowY: "auto"
                    }
                  }
                }}
                listHeight={560}
                filterOption={(input, option) => {
                  const normalizedInput = input.toLowerCase()
                  const rawSearchLabel =
                    (option as any)?.searchLabel ??
                    (typeof option?.label === "string" ? option.label : "")
                  const normalizedLabel = String(rawSearchLabel).toLowerCase()
                  return normalizedLabel.includes(normalizedInput)
                }}
              />
            </Form.Item>

            <Form.Item
              name="keepAlive"
              help={t("modelSettings.form.keepAlive.help")}
              label={t("modelSettings.form.keepAlive.label")}>
              <Input
                placeholder={t("modelSettings.form.keepAlive.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="temperature"
              label={t("modelSettings.form.temperature.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.temperature.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="seed"
              help={t("modelSettings.form.seed.help")}
              label={t("modelSettings.form.seed.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.seed.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="numCtx"
              label={t("modelSettings.form.numCtx.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.numCtx.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="numPredict"
              label={t("modelSettings.form.numPredict.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.numPredict.placeholder")}
              />
            </Form.Item>

            {uploadedFiles.length > 0 && (
              <>
                <Divider />
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Uploaded Files ({uploadedFiles.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        File Retrieval
                      </span>
                      <Switch
                        size="small"
                        checked={fileRetrievalEnabled}
                        onChange={setFileRetrievalEnabled}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{(file.size / 1024).toFixed(1)} KB</span>
                              {fileRetrievalEnabled && (
                                <span className="flex items-center gap-1">
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full ${
                                      file.processed
                                        ? "bg-green-500"
                                        : "bg-yellow-500"
                                    }`}
                                  />
                                  {file.processed
                                    ? "Processed"
                                    : "Processing..."}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeUploadedFile(file.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Divider />

            <Collapse
              ghost
              className="border-none bg-transparent"
              items={[
                {
                  key: "1",
                  label: t("modelSettings.advanced"),
                  children: (
                    <React.Fragment>
                      <Form.Item
                        name="topK"
                        label={t("modelSettings.form.topK.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.topK.placeholder")}
                        />
                      </Form.Item>

                      <Form.Item
                        name="topP"
                        label={t("modelSettings.form.topP.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.topP.placeholder")}
                        />
                      </Form.Item>

                      <Form.Item
                        name="numGpu"
                        label={t("modelSettings.form.numGpu.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.numGpu.placeholder"
                          )}
                        />
                      </Form.Item>

                      <Form.Item
                        name="minP"
                        label={t("modelSettings.form.minP.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.minP.placeholder")}
                        />
                      </Form.Item>
                      <Form.Item
                        name="repeatPenalty"
                        label={t("modelSettings.form.repeatPenalty.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.repeatPenalty.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="repeatLastN"
                        label={t("modelSettings.form.repeatLastN.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.repeatLastN.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="tfsZ"
                        label={t("modelSettings.form.tfsZ.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.tfsZ.placeholder")}
                        />
                      </Form.Item>
                      <Form.Item
                        name="numKeep"
                        label={t("modelSettings.form.numKeep.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.numKeep.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="numThread"
                        label={t("modelSettings.form.numThread.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.numThread.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="useMMap"
                        label={t("modelSettings.form.useMMap.label")}>
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        name="useMlock"
                        label={t("modelSettings.form.useMlock.label")}>
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        name="reasoningEffort"
                        label={t("modelSettings.form.reasoningEffort.label")}>
                        <Input
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.reasoningEffort.placeholder"
                          )}
                        />
                      </Form.Item>
                    </React.Fragment>
                  )
                }
              ]}
            />
            <Form.Item
              label={t("playground:composer.conversationTags", "Conversation state")}
              help={t(
                "playground:composer.stateHelp",
                "Default state is “in-progress.” Update it as the conversation progresses."
              )}>
              <Select
                value={serverChatState || "in-progress"}
                options={conversationStateOptions}
                onChange={async (val) => {
                  const next = val || "in-progress"
                  setServerChatState(next as any)
                  if (!serverChatId) return
                  try {
                    await tldwClient.updateChat(serverChatId, { state: next })
                  } catch (error: any) {
                    notification.error({
                      message: t("error", { defaultValue: "Error" }),
                      description:
                        error?.message ||
                        t("somethingWentWrong", {
                          defaultValue: "Something went wrong"
                        })
                    })
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              label={t("playground:composer.topicPlaceholder", "Conversation tag")}
              help={t(
                "playground:composer.persistence.topicHelp",
                "Optional label for this chat; saved to the server when available."
              )}>
              <Input
                value={serverChatTopic || ""}
                onChange={(e) => setServerChatTopic(e.target.value || null)}
                onBlur={async (e) => {
                  const normalized = e.target.value.trim()
                  const topicValue = normalized.length > 0 ? normalized : null
                  setServerChatTopic(topicValue)
                  if (!serverChatId) return
                  try {
                    await tldwClient.updateChat(serverChatId, {
                      topic_label: topicValue || undefined
                    })
                  } catch (error: any) {
                    notification.error({
                      message: t("error", { defaultValue: "Error" }),
                      description:
                        error?.message ||
                        t("somethingWentWrong", {
                          defaultValue: "Something went wrong"
                        })
                    })
                  }
                }}
                placeholder={t(
                  "playground:composer.topicPlaceholder",
                  "Conversation tag (optional)"
                )}
              />
            </Form.Item>

            <Divider />

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
              <Form.Item name="actorEnabled" valuePropName="checked" className="mb-0">
                <Switch />
              </Form.Item>
            </div>

              {actorSettings && (
                <ActorEditor
                  form={form}
                  settings={actorSettings}
                  setSettings={(next) => setActorSettings(next)}
                  actorPreview={actorPreview}
                  actorTokenCount={actorTokenCount}
                  onRecompute={recomputeActorPreview}
                  newAspectTarget={newAspectTarget}
                  setNewAspectTarget={setNewAspectTarget}
                  newAspectName={newAspectName}
                  setNewAspectName={setNewAspectName}
                  actorPositionValue={actorPositionValue}
                />
              )}
            </div>

            <SaveButton
              className="w-full text-center inline-flex items-center justify-center"
              btnType="submit"
            />
          </Form>
        ) : (
          <Skeleton active />
        )}
      </>
    )
  }

  if (useDrawer) {
    return (
      <Drawer
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        width={500}
        title={t("currentChatModelSettings")}>
        {renderBody()}
      </Drawer>
    )
  }

  return (
    <Modal
      title={t("currentChatModelSettings")}
      open={open}
      onOk={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      footer={null}>
      {renderBody()}
    </Modal>
  )
}
