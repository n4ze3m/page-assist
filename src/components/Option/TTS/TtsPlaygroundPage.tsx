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
  Popover
} from "antd"
import { useTranslation } from "react-i18next"
import { useTTS } from "@/hooks/useTTS"
import { useQuery } from "@tanstack/react-query"
import { getTTSSettings } from "@/services/tts"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { useServerOnline } from "@/hooks/useServerOnline"
import { TTSModeSettings } from "@/components/Option/Settings/tts-mode"
import {
  fetchTtsProviders,
  type TldwTtsProviderCapabilities,
  type TldwTtsVoiceInfo,
  type TldwTtsProvidersInfo
} from "@/services/tldw/audio-providers"

const { Text, Title, Paragraph } = Typography

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
  const { speak, cancel, isSpeaking } = useTTS()
  const { data: ttsSettings } = useQuery({
    queryKey: ["fetchTTSSettings"],
    queryFn: getTTSSettings
  })
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const isOnline = useServerOnline()
  const hasAudio = isOnline && !capsLoading && capabilities?.hasAudio

  const { data: providersInfo } = useQuery<TldwTtsProvidersInfo | null>({
    queryKey: ["tldw-tts-providers"],
    queryFn: fetchTtsProviders,
    enabled: hasAudio
  })

  const handlePlay = async () => {
    if (!text.trim()) return
    await speak({ utterance: text })
  }

  const handleStop = () => {
    cancel()
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
    return inferProviderFromModel(ttsSettings?.tldwTtsModel)
  }, [isTldw, ttsSettings?.tldwTtsModel])

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
  }, [providersInfo, activeProviderCaps])

  return (
    <div className="max-w-3xl mx-auto py-6">
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
              <Paragraph className="!mb-2">
                {t(
                  "playground:tts.inputLabel",
                  "Enter some text to hear it spoken."
                )}
              </Paragraph>
              <Input.TextArea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoSize={{ minRows: 4, maxRows: 10 }}
                placeholder={t(
                  "playground:tts.inputPlaceholder",
                  "Type or paste text here, then use Play to listen."
                ) as string}
              />
            </div>
            <Space>
              <Button
                type="primary"
                onClick={handlePlay}
                disabled={!text.trim()}
                loading={isSpeaking}
              >
                {isSpeaking
                  ? t("playground:tts.playing", "Playing…")
                  : t("playground:tts.play", "Play")}
              </Button>
              <Button onClick={handleStop} disabled={!isSpeaking}>
                {t("playground:tts.stop", "Stop")}
              </Button>
            </Space>
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
    </div>
  )
}

export default TtsPlaygroundPage
