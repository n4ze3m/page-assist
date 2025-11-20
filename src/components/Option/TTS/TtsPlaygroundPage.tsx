import React from "react"
import { Button, Input, Alert, Typography, Space, Card } from "antd"
import { useTranslation } from "react-i18next"
import { useTTS } from "@/hooks/useTTS"
import { useQuery } from "@tanstack/react-query"
import { getTTSSettings } from "@/services/tts"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { useServerOnline } from "@/hooks/useServerOnline"

const { Text, Title, Paragraph } = Typography

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

  return (
    <div className="max-w-3xl mx-auto py-6">
      <Title level={3} className="!mb-1">
        {t("playground:tts.title", "TTS Playground")}
      </Title>
      <Text type="secondary">
        {t(
          "playground:tts.subtitle",
          "Try out text-to-speech with your current TTS provider and settings."
        )}
      </Text>

      <div className="mt-4 space-y-3">
        <Card>
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Text strong>
                {t("playground:tts.currentProvider", "Current provider")}:{" "}
                {providerLabel}
              </Text>
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
            {isTldw && ttsSettings && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
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
                  <Text code>{ttsSettings.tldwTtsResponseFormat || "mp3"}</Text>
                </div>
                <div>
                  <Text strong>Speed:</Text>{" "}
                  <Text code>
                    {ttsSettings.tldwTtsSpeed != null
                      ? ttsSettings.tldwTtsSpeed
                      : 1}
                  </Text>
                </div>
              </div>
            )}
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

