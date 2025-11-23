import { getPromptById } from "@/db/dexie/helpers"
import { useMessageOption } from "@/hooks/useMessageOption"
import { FileIcon, X } from "lucide-react"
import { getAllModelSettings } from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"
import { useQuery } from "@tanstack/react-query"
import {
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Switch
} from "antd"
import React, { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SaveButton } from "../SaveButton"
import { getOCRLanguage } from "@/services/ocr"
import { ocrLanguages } from "@/data/ocr-language"
import { fetchChatModels } from "@/services/tldw-server"
import { ProviderIcons } from "@/components/Common/ProviderIcon"

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
    selectedSystemPrompt,
    uploadedFiles,
    removeUploadedFile,
    selectedModel,
    setSelectedModel,
    fileRetrievalEnabled,
    setFileRetrievalEnabled
  } = useMessageOption()

  const savePrompt = useCallback(
    (value: string) => {
      cUserSettings.setX("systemPrompt", value)
    },
    [cUserSettings]
  )

  const saveSettings = useCallback(
    (values: any) => {
      Object.entries(values).forEach(([key, value]) => {
        if (key !== "systemPrompt" && key !== "ocrLanguage") {
          cUserSettings.setX(key, value)
        }
      })
    },
    [cUserSettings]
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

      form.setFieldsValue({
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
      })
      return data
    },
    enabled: open,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })

  const { data: composerModels, isLoading: modelsLoading } = useQuery({
    queryKey: ["playground:chatModels", open],
    queryFn: () => fetchChatModels({ returnEmpty: true }),
    enabled: open
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

    type GroupOption = { label: React.ReactNode; options: Array<{ label: React.ReactNode; value: string }> }
    const models = (composerModels as any[]) || []
    if (!models.length) {
      if (selectedModel) {
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
                  Custom - {selectedModel}
                </span>
              ),
              value: selectedModel
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

      const optionLabel = (
        <div className="flex items-center gap-2" data-title={`${providerLabel} - ${modelLabel}`}>
          <ProviderIcons provider={rawProvider} className="h-4 w-4" />
          <div className="flex flex-col min-w-0">
            <span className="truncate">
              {providerLabel} - {modelLabel}
            </span>
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
        value: m.model
      })
    }

    const groupedOptions: GroupOption[] = Array.from(groups.values())
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
            }}>
            {useDrawer && (
              <>
                <Form.Item
                  name="systemPrompt"
                  help={t("modelSettings.form.systemPrompt.help")}
                  label={t("modelSettings.form.systemPrompt.label")}>
                  <Input.TextArea
                    rows={4}
                    placeholder={t(
                      "modelSettings.form.systemPrompt.placeholder"
                    )}
                    onChange={(e) => savePrompt(e.target.value)}
                  />
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
                dropdownMatchSelectWidth={false}
                dropdownStyle={{
                  maxHeight: "calc(100vh - 220px)",
                  overflowY: "auto"
                }}
                listHeight={560}
                filterOption={(input, option) =>
                  (option?.label as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
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

            <Form.Item
              name="thinking"
              label={t("modelSettings.form.thinking.label")}>
              <Switch />
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
