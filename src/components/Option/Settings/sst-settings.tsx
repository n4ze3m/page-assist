import { useStorage } from "@plasmohq/storage/hook"
import { Input, InputNumber, Select, Switch } from "antd"
import React from "react"
import { useTranslation } from "react-i18next"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { SUPPORTED_LANGUAGES } from "~/utils/supported-languages"

export const SSTSettings = ({ hideBorder }: { hideBorder?: boolean }) => {
  const { t } = useTranslation("settings")
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )

  const [autoSubmitVoiceMessage, setAutoSubmitVoiceMessage] = useStorage(
    "autoSubmitVoiceMessage",
    false
  )

  const [autoStopTimeout, setAutoStopTimeout] = useStorage(
    "autoStopTimeout",
    2000
  )

  const [sttModel, setSttModel] = useStorage("sttModel", "whisper-1")
  const [sttUseSegmentation, setSttUseSegmentation] = useStorage(
    "sttUseSegmentation",
    false
  )
  const [
    sttTimestampGranularities,
    setSttTimestampGranularities
  ] = useStorage("sttTimestampGranularities", "segment")

  const [sttPrompt, setSttPrompt] = useStorage("sttPrompt", "")
  const [sttTask, setSttTask] = useStorage("sttTask", "transcribe")
  const [sttResponseFormat, setSttResponseFormat] = useStorage(
    "sttResponseFormat",
    "json"
  )
  const [sttTemperature, setSttTemperature] = useStorage(
    "sttTemperature",
    0
  )
  const [sttSegK, setSttSegK] = useStorage("sttSegK", 6)
  const [
    sttSegMinSegmentSize,
    setSttSegMinSegmentSize
  ] = useStorage("sttSegMinSegmentSize", 5)
  const [
    sttSegLambdaBalance,
    setSttSegLambdaBalance
  ] = useStorage("sttSegLambdaBalance", 0.01)
  const [
    sttSegUtteranceExpansionWidth,
    setSttSegUtteranceExpansionWidth
  ] = useStorage("sttSegUtteranceExpansionWidth", 2)
  const [
    sttSegEmbeddingsProvider,
    setSttSegEmbeddingsProvider
  ] = useStorage("sttSegEmbeddingsProvider", "")
  const [sttSegEmbeddingsModel, setSttSegEmbeddingsModel] = useStorage(
    "sttSegEmbeddingsModel",
    ""
  )

  const [serverModels, setServerModels] = React.useState<string[]>([])
  const [serverModelsLoading, setServerModelsLoading] = React.useState(false)
  const [modelHealth, setModelHealth] = React.useState<
    "idle" | "checking" | "ok" | "error"
  >("idle")

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
        }
      } catch (e) {
        if ((import.meta as any)?.env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn("Failed to load transcription models from server", e)
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
  }, [])

  const handleCheckModelHealth = async () => {
    const model = (sttModel || "").trim()
    if (!model) {
      return
    }
    setModelHealth("checking")
    try {
      const res = await tldwClient.getTranscriptionModelHealth(model)
      const status =
        typeof res === "object" && res && "status" in res
          ? (res as any).status
          : undefined
      if (status && typeof status === "string") {
        setModelHealth(status.toLowerCase() === "ok" ? "ok" : "error")
      } else {
        setModelHealth("ok")
      }
    } catch (e) {
      if ((import.meta as any)?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn("Transcription model health check failed", e)
      }
      setModelHealth("error")
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2
          className={`${
            !hideBorder ? "text-base font-semibold leading-7" : "text-md"
          } text-gray-900 dark:text-white`}>
          {t("generalSettings.stt.heading")}
        </h2>
        {!hideBorder && (
          <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
        )}
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
          {t(
            "generalSettings.stt.usedByChat",
            "These Speech-to-Text defaults are used by the chat dictation button in the Playground and Sidebar."
          )}
        </p>
      </div>
      <form className="space-y-4">
        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.settings.speechRecognitionLang.label")}
          </span>

          <Select
            placeholder={t(
              "generalSettings.settings.speechRecognitionLang.placeholder"
            )}
            allowClear
            showSearch
            options={SUPPORTED_LANGUAGES}
            value={speechToTextLanguage}
            filterOption={(input, option) =>
              option!.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
              option!.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            onChange={(value) => {
              setSpeechToTextLanguage(value)
            }}
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.model.label")}
          </span>
          <div
            className={
              hideBorder
                ? "w-full flex flex-col items-end"
                : "!min-w-[200px] flex flex-col items-end"
            }>
            <Select
              className="w-full"
              showSearch
              placeholder="whisper-1, parakeet, canary..."
              loading={serverModelsLoading}
              value={sttModel}
              onChange={(value) => setSttModel(value)}
              options={
                serverModels.length > 0
                  ? serverModels.map((model) => ({
                      label: model,
                      value: model
                    }))
                  : sttModel
                    ? [
                        {
                          label: sttModel,
                          value: sttModel
                        }
                      ]
                    : []
              }
              allowClear
              onClear={() => setSttModel("")}
              dropdownMatchSelectWidth
            />
            {serverModels.length > 0 && (
              <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 self-start">
                {t(
                  "generalSettings.stt.model.helpFromServer",
                  "Models provided by your tldw server ({{count}} total).",
                  { count: serverModels.length }
                )}
              </span>
            )}
            {sttModel && (
              <button
                type="button"
                className="mt-1 text-[11px] text-blue-600 hover:text-blue-500 dark:text-blue-400 self-start"
                onClick={handleCheckModelHealth}>
                {modelHealth === "checking"
                  ? t(
                      "generalSettings.stt.model.healthChecking",
                      "Checking model health…"
                    )
                  : modelHealth === "ok"
                    ? t(
                        "generalSettings.stt.model.healthOk",
                        "Model appears healthy on the server."
                      )
                    : modelHealth === "error"
                      ? t(
                          "generalSettings.stt.model.healthError",
                          "Health check failed or model is unavailable."
                        )
                      : t(
                          "generalSettings.stt.model.healthCheck",
                          "Check model health on server"
                        )}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.useSegmentation.label")}
          </span>
          <Switch
            checked={sttUseSegmentation}
            onChange={(checked) => setSttUseSegmentation(checked)}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.timestampGranularities.label")}
          </span>
          <Select
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            value={sttTimestampGranularities}
            onChange={(value) => setSttTimestampGranularities(value)}
            options={[
              {
                value: "segment",
                label: t("generalSettings.stt.timestampGranularities.segment", "Per segment")
              },
              {
                value: "word",
                label: t("generalSettings.stt.timestampGranularities.word", "Per word")
              },
              {
                value: "segment,word",
                label: t(
                  "generalSettings.stt.timestampGranularities.segmentWord",
                  "Segment + word"
                )
              }
            ]}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.task.label")}
          </span>
          <Select
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            value={sttTask}
            onChange={(value) => setSttTask(value)}
            options={[
              {
                value: "transcribe",
                label: t(
                  "generalSettings.stt.task.transcribe",
                  "Transcribe (same language)"
                )
              },
              {
                value: "translate",
                label: t(
                  "generalSettings.stt.task.translate",
                  "Translate to English"
                )
              }
            ]}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.responseFormat.label")}
          </span>
          <Select
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            value={sttResponseFormat}
            onChange={(value) => setSttResponseFormat(value)}
            options={[
              {
                value: "json",
                label: t(
                  "generalSettings.stt.responseFormat.json",
                  "JSON (text + segments)"
                )
              },
              {
                value: "verbose_json",
                label: t(
                  "generalSettings.stt.responseFormat.verboseJson",
                  "Verbose JSON"
                )
              },
              {
                value: "text",
                label: t(
                  "generalSettings.stt.responseFormat.text",
                  "Plain text"
                )
              },
              {
                value: "srt",
                label: t("generalSettings.stt.responseFormat.srt", "SRT")
              },
              {
                value: "vtt",
                label: t("generalSettings.stt.responseFormat.vtt", "VTT")
              }
            ]}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.temperature.label")}
          </span>
          <InputNumber
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            min={0}
            max={1}
            step={0.1}
            value={sttTemperature}
            onChange={(value) => {
              setSttTemperature(typeof value === "number" ? value : 0)
            }}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.prompt.label")}
          </span>
          <Input
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            placeholder={t(
              "generalSettings.stt.prompt.placeholder",
              "Optional text to guide style"
            )}
            value={sttPrompt}
            onChange={(e) => setSttPrompt(e.target.value)}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.segK.label")}
          </span>
          <InputNumber
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            min={1}
            value={sttSegK}
            onChange={(value) => {
              setSttSegK(typeof value === "number" ? value : 6)
            }}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.segMinSegmentSize.label")}
          </span>
          <InputNumber
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            min={1}
            value={sttSegMinSegmentSize}
            onChange={(value) => {
              setSttSegMinSegmentSize(
                typeof value === "number" ? value : 5
              )
            }}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.segLambdaBalance.label")}
          </span>
          <InputNumber
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            min={0}
            step={0.01}
            value={sttSegLambdaBalance}
            onChange={(value) => {
              setSttSegLambdaBalance(
                typeof value === "number" ? value : 0.01
              )
            }}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.segUtteranceExpansionWidth.label")}
          </span>
          <InputNumber
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            min={0}
            value={sttSegUtteranceExpansionWidth}
            onChange={(value) => {
              setSttSegUtteranceExpansionWidth(
                typeof value === "number" ? value : 2
              )
            }}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.segEmbeddingsProvider.label")}
          </span>
          <Input
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            value={sttSegEmbeddingsProvider}
            onChange={(e) => setSttSegEmbeddingsProvider(e.target.value)}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.segEmbeddingsModel.label")}
          </span>
          <Input
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            value={sttSegEmbeddingsModel}
            onChange={(e) => setSttSegEmbeddingsModel(e.target.value)}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.autoSubmitVoiceMessage.label")}
          </span>
          <Switch
            checked={autoSubmitVoiceMessage}
            onChange={(checked) => {
              setAutoSubmitVoiceMessage(checked)
            }}
          />
        </div>

        <div className="flex flex-row justify-between">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("generalSettings.stt.autoStopTimeout.label")}
          </span>
          <InputNumber
            className={hideBorder ? "w-full" : "!min-w-[200px]"}
            type="number"
            placeholder={t("generalSettings.stt.autoStopTimeout.placeholder")}
            value={autoStopTimeout}
            onChange={(e) => {
              setAutoStopTimeout(e)
            }}
          />
        </div>
      </form>
    </div>
  )
}
