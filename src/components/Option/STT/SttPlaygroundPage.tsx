import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { useTranslation } from "react-i18next"
import { Button, Card, Input, List, Select, Space, Switch, Tag, Tooltip, Typography, notification } from "antd"
import { Mic, Pause, Save, Trash2 } from "lucide-react"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { PageShell } from "@/components/Common/PageShell"

const { Text, Title } = Typography

type RecordedItem = {
  id: string
  createdAt: string
  durationMs?: number
  model?: string
  language?: string
  text: string
}

export const SttPlaygroundPage: React.FC = () => {
  const { t } = useTranslation(["playground", "settings"])
  const [speechToTextLanguage] = useStorage("speechToTextLanguage", "en-US")
  const [sttModel] = useStorage("sttModel", "whisper-1")
  const [sttTask] = useStorage("sttTask", "transcribe")
  const [sttResponseFormat] = useStorage("sttResponseFormat", "json")
  const [sttTemperature] = useStorage("sttTemperature", 0)
  const [sttUseSegmentation] = useStorage("sttUseSegmentation", false)
  const [sttTimestampGranularities] = useStorage(
    "sttTimestampGranularities",
    "segment"
  )
  const [sttPrompt] = useStorage("sttPrompt", "")
  const [sttSegK] = useStorage("sttSegK", 6)
  const [sttSegMinSegmentSize] = useStorage("sttSegMinSegmentSize", 5)
  const [sttSegLambdaBalance] = useStorage("sttSegLambdaBalance", 0.01)
  const [sttSegUtteranceExpansionWidth] = useStorage(
    "sttSegUtteranceExpansionWidth",
    2
  )
  const [sttSegEmbeddingsProvider] = useStorage(
    "sttSegEmbeddingsProvider",
    ""
  )
  const [sttSegEmbeddingsModel] = useStorage(
    "sttSegEmbeddingsModel",
    ""
  )

  const [serverModels, setServerModels] = React.useState<string[]>([])
  const [serverModelsLoading, setServerModelsLoading] = React.useState(false)
  const [activeModel, setActiveModel] = React.useState<string | undefined>()
  const [isRecording, setIsRecording] = React.useState(false)
  const [useLongRunning, setUseLongRunning] = React.useState(false)
  const [liveText, setLiveText] = React.useState("")
  const [items, setItems] = React.useState<RecordedItem[]>([])
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<BlobPart[]>([])
  const startedAtRef = React.useRef<number | null>(null)
  const liveTextRef = React.useRef<string>("")

  React.useEffect(() => {
    let cancelled = false
    const fetchModels = async () => {
      setServerModelsLoading(true)
      try {
        const res = await tldwClient.getTranscriptionModels()
        const all = Array.isArray(res?.all_models)
          ? (res.all_models as string[])
          : []
        if (!cancelled && all.length > 0) {
          const unique = Array.from(new Set(all)).sort()
          setServerModels(unique)
          if (!activeModel) {
            const initial = sttModel && unique.includes(sttModel)
              ? sttModel
              : unique[0]
            setActiveModel(initial)
          }
        }
      } catch (e) {
        if ((import.meta as any)?.env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn("Failed to load transcription models for STT Playground", e)
        }
      } finally {
        if (!cancelled) {
          setServerModelsLoading(false)
        }
      }
    }
    fetchModels()
    return () => {
      cancelled = true
    }
  }, [activeModel, sttModel])

  const handleStopRecording = React.useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder) return
    try {
      recorder.stop()
    } catch {}
  }, [])

  const appendLiveText = React.useCallback((textChunk: string) => {
    if (!textChunk) return
    setLiveText((prev) => {
      const next = prev ? `${prev} ${textChunk}` : textChunk
      liveTextRef.current = next
      return next
    })
  }, [])

  const transcribeBlob = React.useCallback(
    async (blob: Blob, modelOverride?: string): Promise<string> => {
      const sttOptions: Record<string, any> = {
        language: speechToTextLanguage
      }
      const modelToUse = modelOverride || activeModel || sttModel
      if (modelToUse && modelToUse.trim().length > 0) {
        sttOptions.model = modelToUse.trim()
      }
      if (sttTimestampGranularities) {
        sttOptions.timestamp_granularities = sttTimestampGranularities
      }
      if (sttPrompt && sttPrompt.trim().length > 0) {
        sttOptions.prompt = sttPrompt.trim()
      }
      if (sttTask) {
        sttOptions.task = sttTask
      }
      if (sttResponseFormat) {
        sttOptions.response_format = sttResponseFormat
      }
      if (typeof sttTemperature === "number") {
        sttOptions.temperature = sttTemperature
      }
      if (sttUseSegmentation) {
        sttOptions.segment = true
        if (typeof sttSegK === "number") {
          sttOptions.seg_K = sttSegK
        }
        if (typeof sttSegMinSegmentSize === "number") {
          sttOptions.seg_min_segment_size = sttSegMinSegmentSize
        }
        if (typeof sttSegLambdaBalance === "number") {
          sttOptions.seg_lambda_balance = sttSegLambdaBalance
        }
        if (typeof sttSegUtteranceExpansionWidth === "number") {
          sttOptions.seg_utterance_expansion_width =
            sttSegUtteranceExpansionWidth
        }
        if (sttSegEmbeddingsProvider?.trim()) {
          sttOptions.seg_embeddings_provider =
            sttSegEmbeddingsProvider.trim()
        }
        if (sttSegEmbeddingsModel?.trim()) {
          sttOptions.seg_embeddings_model = sttSegEmbeddingsModel.trim()
        }
      }
      const res = await tldwClient.transcribeAudio(blob, sttOptions)
      let text = ""
      if (res) {
        if (typeof res === "string") {
          text = res
        } else if (typeof (res as any).text === "string") {
          text = (res as any).text
        } else if (typeof (res as any).transcript === "string") {
          text = (res as any).transcript
        } else if (Array.isArray((res as any).segments)) {
          text = (res as any).segments
            .map((s: any) => s?.text || "")
            .join(" ")
            .trim()
        }
      }
      return text
    },
    [
      activeModel,
      speechToTextLanguage,
      sttModel,
      sttPrompt,
      sttResponseFormat,
      sttSegEmbeddingsModel,
      sttSegEmbeddingsProvider,
      sttSegK,
      sttSegLambdaBalance,
      sttSegMinSegmentSize,
      sttSegUtteranceExpansionWidth,
      sttTask,
      sttTemperature,
      sttTimestampGranularities,
      sttUseSegmentation
    ]
  )

  const handleStartRecording = async () => {
    if (isRecording) {
      await handleStopRecording()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()
      liveTextRef.current = ""
      setLiveText("")

      recorder.ondataavailable = async (ev: BlobEvent) => {
        if (!ev.data || ev.data.size === 0) return
        if (useLongRunning) {
          try {
            const text = await transcribeBlob(ev.data)
            if (text) {
              appendLiveText(text)
            }
          } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error("Streaming STT chunk failed", e)
          }
        } else {
          chunksRef.current.push(ev.data)
        }
      }

      recorder.onerror = (event: Event) => {
        // eslint-disable-next-line no-console
        console.error("MediaRecorder error", event)
        notification.error({
          message: t("playground:actions.speechErrorTitle", "Dictation failed"),
          description: t(
            "playground:actions.speechErrorBody",
            "Microphone recording error. Check your permissions and try again."
          )
        })
        setIsRecording(false)
      }

      recorder.onstop = async () => {
        try {
          const startedAt = startedAtRef.current
          startedAtRef.current = null
          if (useLongRunning) {
            const text = liveTextRef.current.trim()
            if (!text) {
              return
            }
            const nowIso = new Date().toISOString()
            const durationMs =
              startedAt != null ? Date.now() - startedAt : undefined
            const item: RecordedItem = {
              id: `${nowIso}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: nowIso,
              durationMs,
              model: activeModel || sttModel,
              language: speechToTextLanguage,
              text
            }
            setItems((prev) => [item, ...prev])
          } else {
            const blob = new Blob(chunksRef.current, {
              type: recorder.mimeType || "audio/webm"
            })
            chunksRef.current = []
            if (blob.size === 0) {
              return
            }
            const text = await transcribeBlob(blob)
            if (!text) {
              notification.error({
                message: t(
                  "playground:actions.speechErrorTitle",
                  "Dictation failed"
                ),
                description: t(
                  "playground:actions.speechNoText",
                  "The transcription did not return any text."
                )
              })
              return
            }
            const nowIso = new Date().toISOString()
            const durationMs =
              startedAt != null ? Date.now() - startedAt : undefined
            const item: RecordedItem = {
              id: `${nowIso}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: nowIso,
              durationMs,
              model: activeModel || sttModel,
              language: speechToTextLanguage,
              text
            }
            setItems((prev) => [item, ...prev])
          }
        } catch (e: any) {
          notification.error({
            message: t(
              "playground:actions.speechErrorTitle",
              "Dictation failed"
            ),
            description:
              e?.message ||
              t(
                "playground:actions.speechErrorBody",
                "Transcription request failed. Check tldw server health."
              )
          })
        } finally {
          try {
            stream.getTracks().forEach((trk) => trk.stop())
          } catch {}
          setIsRecording(false)
        }
      }

      recorder.start(useLongRunning ? 5000 : undefined)
      setIsRecording(true)
    } catch (e: any) {
      notification.error({
        message: t("playground:actions.speechErrorTitle", "Dictation failed"),
        description: t(
          "playground:actions.speechMicError",
          "Unable to access your microphone. Check browser permissions and try again."
        )
      })
      setIsRecording(false)
    }
  }

  const handleSaveToNotes = async (item: RecordedItem) => {
    const title = `STT: ${new Date(item.createdAt).toLocaleString()}`
    try {
      await tldwClient.createNote(item.text, {
        title,
        metadata: {
          origin: "stt-playground",
          stt_model: item.model,
          stt_language: item.language
        }
      })
      notification.success({
        message: t(
          "settings:healthPage.copyDiagnostics",
          "Saved to Notes"
        ),
        description: t(
          "playground:tts.savedToNotes",
          "Transcription saved as a note."
        )
      })
    } catch (e: any) {
      notification.error({
        message: t("error", "Error"),
        description: e?.message || t("somethingWentWrong", "Something went wrong")
      })
    }
  }

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <PageShell maxWidthClassName="max-w-4xl" className="py-6">
      <Title level={3} className="!mb-1">
        {t("playground:stt.title", "STT Playground")}
      </Title>
      <Text type="secondary">
        {t(
          "playground:stt.subtitle",
          "Try out transcription models, run longer dictation sessions, and save transcripts into Notes."
        )}
      </Text>

      <div className="mt-4 space-y-4">
        <Card>
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Text strong>
                  {t(
                    "playground:stt.currentModelLabel",
                    "Current transcription model"
                  )}
                  :
                </Text>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    showSearch
                    allowClear
                    placeholder={sttModel || "whisper-1"}
                    loading={serverModelsLoading}
                    value={activeModel}
                    onChange={(value) => setActiveModel(value)}
                    style={{ minWidth: 220 }}
                    options={serverModels.map((m) => ({
                      label: m,
                      value: m
                    }))}
                  />
                  {sttModel && (
                    <Tag bordered>
                      {t(
                        "playground:stt.defaultModel",
                        "Default from Settings"
                      )}
                      :{" "}
                      <Text code className="ml-1">
                        {sttModel}
                      </Text>
                    </Tag>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    "playground:stt.settingsNotice",
                    "Language, task, response format, segmentation, and prompt reuse your Speech-to-Text defaults from Settings."
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="block text-xs">
                  {t(
                    "playground:stt.sessionMode",
                    "Session mode"
                  )}
                </Text>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useLongRunning}
                    onChange={setUseLongRunning}
                    size="small"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {useLongRunning
                      ? t(
                          "playground:stt.modeLong",
                          "Long-running (chunked recording)"
                        )
                      : t(
                          "playground:stt.modeShort",
                          "Short dictation (single clip)"
                        )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Tag color="blue" bordered>
                  {t(
                    "playground:stt.languageTag",
                    "Language"
                  )}
                  :{" "}
                  <Text code className="ml-1">
                    {speechToTextLanguage || "auto"}
                  </Text>
                </Tag>
                <Tag bordered>
                  {t("playground:stt.taskTag", "Task")}{" "}
                  <Text code className="ml-1">
                    {sttTask || "transcribe"}
                  </Text>
                </Tag>
                <Tag bordered>
                  {t("playground:stt.formatTag", "Format")}{" "}
                  <Text code className="ml-1">
                    {sttResponseFormat || "json"}
                  </Text>
                </Tag>
                {sttUseSegmentation && (
                  <Tag color="purple" bordered>
                    {t(
                      "playground:stt.segmentationEnabled",
                      "Segmentation enabled"
                    )}
                  </Tag>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Tooltip
                  placement="left"
                  title={
                    isRecording
                      ? (t(
                          "playground:stt.stopTooltip",
                          "Stop and send to server"
                        ) as string)
                      : (t(
                          "playground:stt.startTooltip",
                          "Start recording audio for transcription"
                        ) as string)
                  }>
                  <Button
                    type={isRecording ? "default" : "primary"}
                    danger={isRecording}
                    icon={
                      isRecording ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )
                    }
                    onClick={handleStartRecording}
                  >
                    {isRecording
                      ? t("playground:stt.stopButton", "Stop")
                      : t("playground:stt.recordButton", "Record")}
                  </Button>
                </Tooltip>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t(
                "playground:tooltip.speechToTextDetails",
                "Uses {{model}} · {{task}} · {{format}}. Configure in Settings → General → Speech-to-Text.",
                {
                  model: activeModel || sttModel || "whisper-1",
                  task: sttTask === "translate" ? "translate" : "transcribe",
                  format: (sttResponseFormat || "json").toUpperCase()
                } as any
              ) as string}
            </div>
            {(liveText || isRecording) && (
              <div className="pt-3">
                <Text strong className="text-xs block mb-1">
                  {t(
                    "playground:stt.currentTranscriptTitle",
                    "Current session transcript"
                  )}
                </Text>
                <Input.TextArea
                  value={liveText}
                  readOnly
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  placeholder={t(
                    "playground:stt.currentTranscriptPlaceholder",
                    "Live transcript will appear here while recording."
                  )}
                />
              </div>
            )}
          </Space>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Text strong>
              {t("playground:stt.historyTitle", "Transcription history")}
            </Text>
            {items.length > 0 && (
              <Button
                size="small"
                type="text"
                icon={<Trash2 className="h-3 w-3" />}
                onClick={() => setItems([])}
              >
                {t("playground:stt.clearAll", "Clear all")}
              </Button>
            )}
          </div>
          {items.length === 0 ? (
            <Text type="secondary" className="text-xs">
              {t(
                "playground:stt.emptyHistory",
                "Start a recording to see transcripts here. You can save any item into Notes."
              )}
            </Text>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Button
                      key="save"
                      size="small"
                      icon={<Save className="h-3 w-3" />}
                      onClick={() => handleSaveToNotes(item)}
                    >
                      {t("playground:stt.saveToNotes", "Save to Notes")}
                    </Button>,
                    <Button
                      key="delete"
                      size="small"
                      type="text"
                      icon={<Trash2 className="h-3 w-3" />}
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      {t("playground:stt.delete", "Delete")}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex flex-wrap items-center gap-2">
                        <Text>
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                        {item.durationMs != null && (
                          <Tag bordered>
                            {t(
                              "playground:stt.durationTag",
                              "Duration"
                            )}
                            :{" "}
                            <Text code className="ml-1">
                              {(item.durationMs / 1000).toFixed(1)}s
                            </Text>
                          </Tag>
                        )}
                        {item.model && (
                          <Tag bordered>
                            {t("playground:stt.modelTag", "Model")}{" "}
                            <Text code className="ml-1">
                              {item.model}
                            </Text>
                          </Tag>
                        )}
                      </div>
                    }
                  />
                  <Input.TextArea
                    value={item.text}
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    readOnly
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </PageShell>
  )
}

export default SttPlaygroundPage
