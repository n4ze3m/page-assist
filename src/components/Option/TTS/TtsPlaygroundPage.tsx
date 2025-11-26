import React from "react"
import {
  Button,
  Input,
  Alert,
  Typography,
  Space,
  Card,
  Divider,
  Tag,
  Popover,
  Select
} from "antd"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getTTSProvider, getTTSSettings, setTTSSettings } from "@/services/tts"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { useServerOnline } from "@/hooks/useServerOnline"
import { TTSModeSettings } from "@/components/Option/Settings/tts-mode"
import {
  fetchTldwTtsModels,
  type TldwTtsModel
} from "@/services/tldw/audio-models"
import { fetchTldwVoiceCatalog } from "@/services/tldw/audio-voices"
import {
  fetchTtsProviders,
  type TldwTtsProviderCapabilities,
  type TldwTtsVoiceInfo,
  type TldwTtsProvidersInfo
} from "@/services/tldw/audio-providers"
import { useTtsPlayground } from "@/hooks/useTtsPlayground"
import { PageShell } from "@/components/Common/PageShell"
import { getModels, getVoices } from "@/services/elevenlabs"

const { Text, Title, Paragraph } = Typography
const SAMPLE_TEXT =
  "Sample: Hi there, this is the TTS playground reading a short passage so you can preview voice and speed.";

const OPENAI_TTS_MODELS = [
  { label: "tts-1", value: "tts-1" },
  { label: "tts-1-hd", value: "tts-1-hd" }
]

const OPENAI_TTS_VOICES: Record<string, { label: string; value: string }[]> = {
  "tts-1": [
    { label: "alloy", value: "alloy" },
    { label: "echo", value: "echo" },
    { label: "fable", value: "fable" },
    { label: "onyx", value: "onyx" },
    { label: "nova", value: "nova" },
    { label: "shimmer", value: "shimmer" }
  ],
  "tts-1-hd": [
    { label: "alloy", value: "alloy" },
    { label: "echo", value: "echo" },
    { label: "fable", value: "fable" },
    { label: "onyx", value: "onyx" },
    { label: "nova", value: "nova" },
    { label: "shimmer", value: "shimmer" }
  ]
}

const inferProviderFromModel = (model?: string | null): string | null => {
  if (!model) return null
  const m = String(model).trim().toLowerCase()
  if (m === "tts-1" || m === "tts-1-hd" || m.startsWith("gpt-")) return "openai"
  if (m.startsWith("kokoro")) return "kokoro"
  if (m.startsWith("higgs")) return "higgs"
  if (m.startsWith("dia")) return "dia"
  if (m.startsWith("chatterbox")) return "chatterbox"
  if (m.startsWith("vibevoice")) return "vibevoice"
  if (m.startsWith("neutts")) return "neutts"
  if (m.startsWith("eleven")) return "elevenlabs"
  if (m.startsWith("index_tts") || m.startsWith("indextts")) return "index_tts"
  return null
}

const TtsPlaygroundPage: React.FC = () => {
  const { t } = useTranslation(["playground", "settings"])
  const [text, setText] = React.useState("")
  const { data: ttsSettings } = useQuery({
    queryKey: ["fetchTTSSettings"],
    queryFn: getTTSSettings
  })
  const queryClient = useQueryClient()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const isOnline = useServerOnline()
  const hasAudio = isOnline && !capsLoading && capabilities?.hasAudio

  const { data: providersInfo } = useQuery<TldwTtsProvidersInfo | null>({
    queryKey: ["tldw-tts-providers"],
    queryFn: fetchTtsProviders,
    enabled: hasAudio
  })

  const { data: tldwTtsModels } = useQuery<TldwTtsModel[]>({
    queryKey: ["tldw-tts-models"],
    queryFn: fetchTldwTtsModels,
    enabled: hasAudio
  })

  const { data: elevenLabsData } = useQuery({
    queryKey: [
      "tts-playground-elevenlabs",
      ttsSettings?.ttsProvider,
      ttsSettings?.elevenLabsApiKey
    ],
    queryFn: async () => {
      if (ttsSettings?.ttsProvider !== "elevenlabs" || !ttsSettings.elevenLabsApiKey) {
        return null
      }
      try {
        const voices = await getVoices(ttsSettings.elevenLabsApiKey)
        const models = await getModels(ttsSettings.elevenLabsApiKey)
        return { voices, models }
      } catch (e) {
        console.error(e)
        return null
      }
    },
    enabled:
      ttsSettings?.ttsProvider === "elevenlabs" &&
      !!ttsSettings?.elevenLabsApiKey
  })

  const {
    segments,
    isGenerating,
    generateSegments,
    clearSegments
  } = useTtsPlayground()
  const [activeSegmentIndex, setActiveSegmentIndex] = React.useState<
    number | null
  >(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)

  const provider = ttsSettings?.ttsProvider || "browser"

  const [elevenVoiceId, setElevenVoiceId] = React.useState<string | undefined>(
    undefined
  )
  const [elevenModelId, setElevenModelId] = React.useState<string | undefined>(
    undefined
  )
  const [tldwModel, setTldwModel] = React.useState<string | undefined>(
    undefined
  )
  const [tldwVoice, setTldwVoice] = React.useState<string | undefined>(
    undefined
  )
  const [openAiModel, setOpenAiModel] = React.useState<string | undefined>(
    undefined
  )
  const [openAiVoice, setOpenAiVoice] = React.useState<string | undefined>(
    undefined
  )
  const controlIds = {
    textInput: "tts-playground-input",
    elevenVoice: "tts-playground-eleven-voice",
    elevenModel: "tts-playground-eleven-model",
    tldwVoice: "tts-playground-tldw-voice",
    tldwModel: "tts-playground-tldw-model",
    openAiModel: "tts-playground-openai-model",
    openAiVoice: "tts-playground-openai-voice"
  }

  React.useEffect(() => {
    if (!ttsSettings) return
    setElevenVoiceId(ttsSettings.elevenLabsVoiceId || undefined)
    setElevenModelId(ttsSettings.elevenLabsModel || undefined)
    setTldwModel(ttsSettings.tldwTtsModel || undefined)
    setTldwVoice(ttsSettings.tldwTtsVoice || undefined)
    setOpenAiModel(ttsSettings.openAITTSModel || undefined)
    setOpenAiVoice(ttsSettings.openAITTSVoice || undefined)
  }, [ttsSettings])

  const handleAudioTimeUpdate = () => {
    const el = audioRef.current
    if (!el) return
    setCurrentTime(el.currentTime || 0)
    setDuration(el.duration || 0)
  }

  const handleSegmentSelect = (idx: number) => {
    setActiveSegmentIndex(idx)
    setCurrentTime(0)
    setDuration(0)
  }

  const isTtsDisabled = ttsSettings?.ttsEnabled === false
  const handlePlay = async () => {
    if (!text.trim() || isTtsDisabled) return
    clearSegments()
    setActiveSegmentIndex(null)
    setCurrentTime(0)
    setDuration(0)

    const effectiveProvider = ttsSettings?.ttsProvider || (await getTTSProvider())

    await generateSegments(text, {
      provider: effectiveProvider,
      elevenLabsModel: elevenModelId,
      elevenLabsVoiceId: elevenVoiceId,
      tldwModel,
      tldwVoice,
      openAiModel,
      openAiVoice
    })

    if (ttsSettings) {
      void setTTSSettings({
        ttsEnabled: ttsSettings.ttsEnabled,
        ttsProvider: ttsSettings.ttsProvider,
        voice: ttsSettings.voice,
        ssmlEnabled: ttsSettings.ssmlEnabled,
        elevenLabsApiKey: ttsSettings.elevenLabsApiKey,
        elevenLabsVoiceId: elevenVoiceId ?? ttsSettings.elevenLabsVoiceId,
        elevenLabsModel: elevenModelId ?? ttsSettings.elevenLabsModel,
        responseSplitting: ttsSettings.responseSplitting,
        removeReasoningTagTTS: ttsSettings.removeReasoningTagTTS,
        openAITTSBaseUrl: ttsSettings.openAITTSBaseUrl,
        openAITTSApiKey: ttsSettings.openAITTSApiKey,
        openAITTSModel: openAiModel ?? ttsSettings.openAITTSModel,
        openAITTSVoice: openAiVoice ?? ttsSettings.openAITTSVoice,
        ttsAutoPlay: ttsSettings.ttsAutoPlay,
        playbackSpeed: ttsSettings.playbackSpeed,
        tldwTtsModel: tldwModel ?? ttsSettings.tldwTtsModel,
        tldwTtsVoice: tldwVoice ?? ttsSettings.tldwTtsVoice,
        tldwTtsResponseFormat: ttsSettings.tldwTtsResponseFormat,
        tldwTtsSpeed: ttsSettings.tldwTtsSpeed
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["fetchTTSSettings"] })
      })
    }

    setActiveSegmentIndex(0)
  }

  const handleStop = () => {
    const el = audioRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    setCurrentTime(0)
    setDuration(0)
  }

  const providerLabel = React.useMemo(() => {
    const p = ttsSettings?.ttsProvider || "browser"
    if (p === "browser") return "Browser TTS"
    if (p === "elevenlabs") return "ElevenLabs"
    if (p === "openai") return "OpenAI TTS"
    if (p === "tldw") return "tldw server (audio/speech)"
    return p
  }, [ttsSettings?.ttsProvider])

  const isTldw = ttsSettings?.ttsProvider === "tldw"

  const inferredProviderKey = React.useMemo(() => {
    if (!isTldw) return null
    return inferProviderFromModel(tldwModel || ttsSettings?.tldwTtsModel)
  }, [isTldw, tldwModel, ttsSettings?.tldwTtsModel])

  const { data: tldwVoiceCatalog } = useQuery<TldwTtsVoiceInfo[]>({
    queryKey: ["tldw-voice-catalog", inferredProviderKey],
    queryFn: async () => {
      if (!inferredProviderKey) return []
      const voices = await fetchTldwVoiceCatalog(inferredProviderKey)
      return voices.map((v) => ({
        id: v.voice_id || v.id || v.name,
        name: v.name || v.voice_id || v.id,
        language: (v as any)?.language,
        gender: (v as any)?.gender,
        description: v.description,
        preview_url: (v as any)?.preview_url
      })) as TldwTtsVoiceInfo[]
    },
    enabled: hasAudio && isTldw && Boolean(inferredProviderKey)
  })

  const activeProviderCaps = React.useMemo(
    (): { key: string; caps: TldwTtsProviderCapabilities } | null => {
      if (!providersInfo || !inferredProviderKey) return null
      const entries = Object.entries(providersInfo.providers || {})
      const match = entries.find(
        ([k]) => k.toLowerCase() === inferredProviderKey.toLowerCase()
      )
      if (!match) return null
      return { key: match[0], caps: match[1] }
    },
    [providersInfo, inferredProviderKey]
  )

  const activeVoices = React.useMemo((): TldwTtsVoiceInfo[] => {
    if (tldwVoiceCatalog && tldwVoiceCatalog.length > 0) {
      return tldwVoiceCatalog.slice(0, 4)
    }
    if (!providersInfo || !activeProviderCaps) return []
    const allVoices = providersInfo.voices || {}
    const direct = allVoices[activeProviderCaps.key]
    if (Array.isArray(direct) && direct.length > 0) {
      return direct.slice(0, 4)
    }
    const fallbackKey = activeProviderCaps.key.toLowerCase()
    const fallback = allVoices[fallbackKey]
    if (Array.isArray(fallback) && fallback.length > 0) {
      return fallback.slice(0, 4)
    }
    return []
  }, [providersInfo, activeProviderCaps, tldwVoiceCatalog])

  const providerVoices = React.useMemo((): TldwTtsVoiceInfo[] => {
    if (tldwVoiceCatalog && tldwVoiceCatalog.length > 0) {
      return tldwVoiceCatalog
    }
    if (!providersInfo || !activeProviderCaps) return []
    const allVoices = providersInfo.voices || {}
    const direct = allVoices[activeProviderCaps.key]
    if (Array.isArray(direct) && direct.length > 0) {
      return direct
    }
    const fallbackKey = activeProviderCaps.key.toLowerCase()
    const fallback = allVoices[fallbackKey]
    if (Array.isArray(fallback) && fallback.length > 0) {
      return fallback
    }
    return []
  }, [providersInfo, activeProviderCaps, tldwVoiceCatalog])

  const openAiVoiceOptions = React.useMemo(() => {
    if (!openAiModel) {
      // If no model selected yet, show the union of known voices.
      const seen = new Set<string>()
      const all: { label: string; value: string }[] = []
      Object.values(OPENAI_TTS_VOICES).forEach((list) => {
        list.forEach((v) => {
          if (!seen.has(v.value)) {
            seen.add(v.value)
            all.push(v)
          }
        })
      })
      return all
    }
    return OPENAI_TTS_VOICES[openAiModel] || []
  }, [openAiModel])

  const playDisabledReason = isTtsDisabled
    ? t(
        "playground:tts.playDisabledTtsOff",
        "Enable text-to-speech above to play audio."
      )
    : !text.trim()
      ? t("playground:tts.playDisabledNoText", "Enter text to enable Play.")
      : null
  const isPlayDisabled = isGenerating || Boolean(playDisabledReason)
  const canStop = Boolean(segments.length || audioRef.current)
  const stopDisabledReason =
    !canStop &&
    t(
      "playground:tts.stopDisabled",
      "Stop activates after audio starts."
    )

  return (
    <PageShell maxWidthClassName="max-w-3xl" className="py-6">
      <Title level={3} className="!mb-1">
        {t("playground:tts.title", "TTS Playground")}
      </Title>
      <Text type="secondary">
        {t(
          "playground:tts.subtitle",
          "Try out text-to-speech and tweak providers, models, and voices."
        )}
      </Text>

      <div className="mt-4 space-y-4">
        <Card>
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="space-y-1">
                <Text strong>
                  {t("playground:tts.currentProvider", "Current provider")}:{" "}
                  {providerLabel}
                </Text>
                {isTldw && ttsSettings && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    <div>
                      <Text strong>Model:</Text>{" "}
                      <Text code>{ttsSettings.tldwTtsModel || "kokoro"}</Text>
                    </div>
                    <div>
                      <Text strong>Voice:</Text>{" "}
                      <Text code>{ttsSettings.tldwTtsVoice || "af_heart"}</Text>
                    </div>
                    <div>
                      <Text strong>Response format:</Text>{" "}
                      <Text code>
                        {ttsSettings.tldwTtsResponseFormat || "mp3"}
                      </Text>
                    </div>
                    <div>
                      <Text strong>Speed:</Text>{" "}
                      <Text code>
                        {ttsSettings.tldwTtsSpeed != null
                          ? ttsSettings.tldwTtsSpeed
                          : 1}
                      </Text>
                    </div>
                    {activeProviderCaps && (
                      <div className="pt-1 flex flex-wrap items-center gap-1">
                        <Text className="mr-1">
                          {t(
                            "playground:tts.providerCapabilities",
                            "Provider capabilities"
                          )}
                          :
                        </Text>
                        {activeProviderCaps.caps.supports_streaming && (
                          <Tag color="blue" bordered>
                            Streaming
                          </Tag>
                        )}
                        {activeProviderCaps.caps.supports_voice_cloning && (
                          <Tag color="magenta" bordered>
                            Voice cloning
                          </Tag>
                        )}
                        {activeProviderCaps.caps.supports_ssml && (
                          <Tag color="gold" bordered>
                            SSML
                          </Tag>
                        )}
                        {activeProviderCaps.caps.supports_speech_rate && (
                          <Tag color="green" bordered>
                            Speed control
                          </Tag>
                        )}
                        {activeProviderCaps.caps.supports_emotion_control && (
                          <Tag color="purple" bordered>
                            Emotion/style
                          </Tag>
                        )}
                      </div>
                    )}
                    {activeVoices.length > 0 && (
                      <div className="pt-1 text-[11px]">
                        <Text strong>
                          {t(
                            "playground:tts.voicesPreview",
                            "Server voices"
                          )}
                          :
                        </Text>{" "}
                        {activeVoices.map((v, idx) => (
                          <span key={v.id || v.name || idx}>
                            <Text code>{v.name || v.id}</Text>
                            {v.language && (
                              <span className="ml-0.5 text-gray-400">
                                ({v.language})
                              </span>
                            )}
                            {idx < activeVoices.length - 1 && <span>, </span>}
                          </span>
                        ))}
                        {providersInfo &&
                          activeProviderCaps &&
                          Array.isArray(
                            providersInfo.voices?.[activeProviderCaps.key]
                          ) &&
                          providersInfo.voices[activeProviderCaps.key].length >
                            activeVoices.length && (
                            <span className="ml-1 text-gray-400">…</span>
                          )}
                      </div>
                    )}
                    {activeProviderCaps && (
                      <div className="pt-1">
                        <Popover
                          placement="right"
                          content={
                            <pre className="max-w-xs max-h-64 overflow-auto text-[11px] leading-snug">
                              {JSON.stringify(
                                activeProviderCaps.caps,
                                null,
                                2
                              )}
                            </pre>
                          }
                          title={t(
                            "playground:tts.providerDetailsTitle",
                            "Provider details"
                          )}
                        >
                          <Button size="small" type="link">
                            {t(
                              "playground:tts.providerDetails",
                              "View raw provider config"
                            )}
                          </Button>
                        </Popover>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isTldw && (
                <Text type="secondary" className="text-xs">
                  {hasAudio
                    ? t(
                        "playground:tts.tldwStatusOnline",
                        "tldw server audio API detected (audio/speech)"
                      )
                    : t(
                        "playground:tts.tldwStatusOffline",
                        "Audio API not detected; check your tldw server version."
                      )}
                </Text>
              )}
            </div>

            <Divider className="!my-2" />

            <div>
              <Paragraph className="!mb-1">
                {t(
                  "playground:tts.settingsIntro",
                  "Adjust your TTS provider, model, and voice. These settings are reused when you play audio from chat or media."
                )}
              </Paragraph>
              <TTSModeSettings hideBorder />
            </div>
          </Space>
        </Card>

        <Card>
          <Space direction="vertical" className="w-full" size="middle">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Paragraph className="!mb-2 !mr-2">
                  {t(
                    "playground:tts.inputLabel",
                    "Enter some text to hear it spoken."
                  )}
                </Paragraph>
                <Button
                  size="small"
                  onClick={() => setText(SAMPLE_TEXT)}
                  aria-label={t(
                    "playground:tts.sampleText",
                    "Insert sample text"
                  ) as string}
                >
                  {t("playground:tts.sampleText", "Insert sample text")}
                </Button>
              </div>
              <Input.TextArea
                id={controlIds.textInput}
                aria-label={t(
                  "playground:tts.inputLabel",
                  "Enter some text to hear it spoken."
                ) as string}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoSize={{ minRows: 4, maxRows: 10 }}
                placeholder={t(
                  "playground:tts.inputPlaceholder",
                  "Type or paste text here, then use Play to listen."
                ) as string}
              />
            </div>

            {ttsSettings?.ttsProvider === "elevenlabs" && elevenLabsData && (
              <div className="flex flex-col gap-2">
                <Text type="secondary">
                  {t(
                    "playground:tts.voiceSelector.elevenLabs",
                    "Choose an ElevenLabs voice and model for this run."
                  )}
                </Text>
                <Space className="flex flex-wrap" size="middle">
                  <div>
                    <label
                      className="block text-xs mb-1 text-gray-700 dark:text-gray-200"
                      htmlFor={controlIds.elevenVoice}>
                      Voice
                    </label>
                    <Select
                      id={controlIds.elevenVoice}
                      aria-label="ElevenLabs voice"
                      style={{ minWidth: 160 }}
                      placeholder="Select voice"
                      className="focus-ring"
                      options={elevenLabsData.voices.map((v: any) => ({
                        label: v.name,
                        value: v.voice_id
                      }))}
                      value={elevenVoiceId}
                      onChange={(val) => setElevenVoiceId(val)}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs mb-1 text-gray-700 dark:text-gray-200"
                      htmlFor={controlIds.elevenModel}>
                      Model
                    </label>
                    <Select
                      id={controlIds.elevenModel}
                      aria-label="ElevenLabs model"
                      style={{ minWidth: 160 }}
                      placeholder="Select model"
                      className="focus-ring"
                      options={elevenLabsData.models.map((m: any) => ({
                        label: m.name,
                        value: m.model_id
                      }))}
                      value={elevenModelId}
                      onChange={(val) => setElevenModelId(val)}
                    />
                  </div>
                </Space>
              </div>
            )}

            {isTldw && providerVoices.length > 0 && (
              <div className="flex flex-col gap-2">
                <Text type="secondary">
                  {t(
                    "playground:tts.voiceSelector.tldw",
                    "Choose a server voice and model for this run."
                  )}
                </Text>
                <Space className="flex flex-wrap" size="middle">
                  <div>
                    <label
                      className="block text-xs mb-1 text-gray-700 dark:text-gray-200"
                      htmlFor={controlIds.tldwVoice}>
                      Voice
                    </label>
                    <Select
                      id={controlIds.tldwVoice}
                      aria-label="tldw server voice"
                      style={{ minWidth: 200 }}
                      placeholder="Select voice"
                      className="focus-ring"
                      options={providerVoices.map((v, idx) => ({
                        label: `${v.name || v.id || `Voice ${idx + 1}`}${
                          v.language ? ` (${v.language})` : ""
                        }`,
                        value: v.id || v.name || ""
                      }))}
                      value={tldwVoice}
                      onChange={(val) => setTldwVoice(val)}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs mb-1 text-gray-700 dark:text-gray-200"
                      htmlFor={controlIds.tldwModel}>
                      Model
                    </label>
                    {tldwTtsModels && tldwTtsModels.length > 0 ? (
                      <Select
                        id={controlIds.tldwModel}
                        aria-label="tldw server model"
                        style={{ minWidth: 160 }}
                        placeholder="Select model"
                        showSearch
                        optionFilterProp="label"
                        className="focus-ring"
                        options={tldwTtsModels.map((m) => ({
                          label: m.label,
                          value: m.id
                        }))}
                        value={tldwModel}
                        onChange={(val) => setTldwModel(val)}
                      />
                    ) : (
                      <Input
                        aria-label="tldw server model"
                        style={{ minWidth: 160 }}
                        value={tldwModel || ""}
                        onChange={(e) => setTldwModel(e.target.value)}
                        placeholder="kokoro"
                      />
                    )}
                  </div>
                </Space>
              </div>
            )}

            {ttsSettings?.ttsProvider === "openai" && (
              <div className="flex flex-col gap-2">
                <Text type="secondary">
                  {t(
                    "playground:tts.voiceSelector.openai",
                    "Choose an OpenAI TTS model and voice for this run."
                  )}
                </Text>
                <Space className="flex flex-wrap" size="middle">
                  <div>
                    <label
                      className="block text-xs mb-1 text-gray-700 dark:text-gray-200"
                      htmlFor={controlIds.openAiModel}>
                      Model
                    </label>
                    <Select
                      id={controlIds.openAiModel}
                      aria-label="OpenAI TTS model"
                      style={{ minWidth: 160 }}
                      placeholder="Select model"
                      className="focus-ring"
                      options={OPENAI_TTS_MODELS}
                      value={openAiModel}
                      onChange={(val) => {
                        setOpenAiModel(val)
                        const voicesForModel =
                          OPENAI_TTS_VOICES[val] || openAiVoiceOptions
                        if (
                          voicesForModel.length > 0 &&
                          !voicesForModel.find((v) => v.value === openAiVoice)
                        ) {
                          setOpenAiVoice(voicesForModel[0].value)
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs mb-1 text-gray-700 dark:text-gray-200"
                      htmlFor={controlIds.openAiVoice}>
                      Voice
                    </label>
                    <Select
                      id={controlIds.openAiVoice}
                      aria-label="OpenAI TTS voice"
                      style={{ minWidth: 160 }}
                      placeholder="Select voice"
                      className="focus-ring"
                      options={openAiVoiceOptions}
                      value={openAiVoice}
                      onChange={(val) => setOpenAiVoice(val)}
                    />
                  </div>
                </Space>
              </div>
            )}

            <Space>
              <Button
                type="primary"
                onClick={handlePlay}
                disabled={isPlayDisabled}
                loading={isGenerating}
              >
                {isGenerating
                  ? t("playground:tts.playing", "Playing…")
                  : t("playground:tts.play", "Play")}
              </Button>
              <Button
                onClick={handleStop}
                disabled={!canStop}
              >
                {t("playground:tts.stop", "Stop")}
              </Button>
            </Space>
            <Text type="secondary" className="text-xs">
              {playDisabledReason ||
                t(
                  "playground:tts.playHelper",
                  "Play uses your selected provider, voice, and speed."
                )}
              {!canStop && stopDisabledReason ? ` ${stopDisabledReason}` : ""}
            </Text>

            {segments.length > 0 && (
              <div className="mt-4 space-y-2 w-full">
                <div>
                  <Text strong>
                    {t(
                      "playground:tts.outputTitle",
                      "Generated audio segments"
                    )}
                  </Text>
                  <Paragraph className="!mb-1 text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      "playground:tts.outputHelp",
                      "Select a segment, then use the player controls to play, pause, or seek."
                    )}
                  </Paragraph>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-2">
                  <audio
                    ref={audioRef}
                    controls
                    className="w-full"
                    src={
                      activeSegmentIndex != null
                        ? segments[activeSegmentIndex]?.url
                        : segments[0]?.url
                    }
                    onTimeUpdate={handleAudioTimeUpdate}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {activeSegmentIndex != null
                        ? t("playground:tts.currentSegment", "Segment") +
                          ` ${activeSegmentIndex + 1}/${segments.length}`
                        : t(
                            "playground:tts.currentSegmentNone",
                            "No segment selected"
                          )}
                    </span>
                    {duration > 0 && (
                      <span>
                        {t("playground:tts.timeLabel", "Time")}:{" "}
                        {Math.floor(currentTime)}s / {Math.floor(duration)}s
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {segments.map((seg, idx) => (
                      <Button
                        key={seg.id}
                        size="small"
                        type={
                          idx ===
                          (activeSegmentIndex != null
                            ? activeSegmentIndex
                            : 0)
                            ? "primary"
                            : "default"
                        }
                        onClick={() => handleSegmentSelect(idx)}
                      >
                        {t("playground:tts.segmentLabel", "Part")} {idx + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Space>
        </Card>

        {isTldw && !hasAudio && (
          <Alert
            type="warning"
            showIcon
            message={t(
              "playground:tts.tldwWarningTitle",
              "tldw audio/speech API not detected"
            )}
            description={t(
              "playground:tts.tldwWarningBody",
              "Ensure your tldw_server version includes /api/v1/audio/speech and that your extension is connected with a valid API key."
            )}
          />
        )}
      </div>
    </PageShell>
  )
}

export default TtsPlaygroundPage
