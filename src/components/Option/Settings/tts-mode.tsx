import { SaveButton } from "@/components/Common/SaveButton"
import { getModels, getVoices } from "@/services/elevenlabs"
import { getTTSSettings, setTTSSettings } from "@/services/tts"
import { useQuery as useRQ, useQueryClient } from "@tanstack/react-query"
import { fetchTldwVoices, type TldwVoice } from "@/services/tldw/audio-voices"
import {
  fetchTldwTtsModels,
  type TldwTtsModel
} from "@/services/tldw/audio-models"
import { useWebUI } from "@/store/webui"
import { useForm } from "@mantine/form"
import { useQuery } from "@tanstack/react-query"
import { Input, InputNumber, Select, Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { useAntdMessage } from "@/hooks/useAntdMessage"

export const TTSModeSettings = ({ hideBorder }: { hideBorder?: boolean }) => {
  const { t } = useTranslation("settings")
  const message = useAntdMessage()
  const { setTTSEnabled } = useWebUI()
  const queryClient = useQueryClient()
  const ids = {
    ttsEnabled: "tts-enabled-toggle",
    ttsAutoPlay: "tts-auto-play-toggle",
    ttsProvider: "tts-provider-select",
    browserVoice: "browser-voice-select",
    elevenVoice: "elevenlabs-voice-select",
    elevenModel: "elevenlabs-model-select",
    tldwModel: "tldw-model-select",
    tldwVoice: "tldw-voice-select",
    tldwResponseFormat: "tldw-response-format",
    tldwSpeed: "tldw-speed-input",
    ssmlEnabled: "tts-ssml-toggle",
    removeReasoning: "tts-remove-reasoning-toggle",
    playbackSpeed: "tts-playback-speed-input",
    openAiModel: "openai-model-select",
    openAiVoice: "openai-voice-select"
  }

  const form = useForm({
    initialValues: {
      ttsEnabled: false,
      ttsProvider: "",
      voice: "",
      ssmlEnabled: false,
      removeReasoningTagTTS: true,
      elevenLabsApiKey: "",
      elevenLabsVoiceId: "",
      elevenLabsModel: "",
      responseSplitting: "",
      openAITTSBaseUrl: "",
      openAITTSApiKey: "",
      openAITTSModel: "",
      openAITTSVoice: "",
      ttsAutoPlay: false,
      playbackSpeed: 1,
      tldwTtsModel: "",
      tldwTtsVoice: "",
      tldwTtsResponseFormat: "mp3",
      tldwTtsSpeed: 1
    }
  })

  const { status, data } = useQuery({
    queryKey: ["fetchTTSSettings"],
    queryFn: async () => {
      const data = await getTTSSettings()
      form.setValues(data)
      return data
    }
  })

  const { data: elevenLabsData } = useQuery({
    queryKey: ["fetchElevenLabsData", form.values.elevenLabsApiKey],
    queryFn: async () => {
      try {
        if (
          form.values.ttsProvider === "elevenlabs" &&
          form.values.elevenLabsApiKey
        ) {
          const voices = await getVoices(form.values.elevenLabsApiKey)
          const models = await getModels(form.values.elevenLabsApiKey)
          return { voices, models }
        }
      } catch (e) {
        console.error(e)
        message.error("Error fetching ElevenLabs data")
      }
      return null
    },
    enabled:
      form.values.ttsProvider === "elevenlabs" && !!form.values.elevenLabsApiKey
  })

  const { data: tldwVoices } = useRQ({
    queryKey: ["fetchTldwVoices"],
    queryFn: fetchTldwVoices,
    enabled: form.values.ttsProvider === "tldw"
  })

  const { data: tldwModels } = useRQ<TldwTtsModel[]>({
    queryKey: ["fetchTldwTtsModels"],
    queryFn: fetchTldwTtsModels,
    enabled: form.values.ttsProvider === "tldw"
  })

  if (status === "pending" || status === "error") {
    return <Skeleton active />
  }

  return (
    <div>
      <div className="mb-5">
        <h2
          className={`${
            !hideBorder ? "text-base font-semibold leading-7" : "text-md"
          } text-gray-900 dark:text-white`}>
          {t("generalSettings.tts.heading")}
        </h2>
        {!hideBorder && (
          <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
        )}
      </div>
      <form
        onSubmit={form.onSubmit(async (values) => {
          await setTTSSettings(values)
          setTTSEnabled(values.ttsEnabled)
          queryClient.invalidateQueries({ queryKey: ["fetchTTSSettings"] })
        })}
        className="space-y-4">
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <label
            className="text-gray-700 dark:text-neutral-50 "
            htmlFor={ids.ttsEnabled}>
            {t("generalSettings.tts.ttsEnabled.label")}
          </label>
          <div>
            <Switch
              id={ids.ttsEnabled}
              aria-label={t("generalSettings.tts.ttsEnabled.label") as string}
              className="mt-4 sm:mt-0 focus-ring"
              {...form.getInputProps("ttsEnabled", {
                type: "checkbox"
              })}
            />
          </div>
        </div>
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <label
            className="text-gray-700 dark:text-neutral-50 "
            htmlFor={ids.ttsAutoPlay}>
            {t("generalSettings.tts.ttsAutoPlay.label")}
          </label>
          <div>
            <Switch
              id={ids.ttsAutoPlay}
              aria-label={t("generalSettings.tts.ttsAutoPlay.label") as string}
              className="mt-4 sm:mt-0 focus-ring"
              {...form.getInputProps("ttsAutoPlay", {
                type: "checkbox"
              })}
            />
          </div>
        </div>
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <label
            className="text-gray-700 dark:text-neutral-50 "
            htmlFor={ids.ttsProvider}>
            {t("generalSettings.tts.ttsProvider.label")}
          </label>
          <div>
            <Select
              id={ids.ttsProvider}
              aria-label={t("generalSettings.tts.ttsProvider.label") as string}
              placeholder={t("generalSettings.tts.ttsProvider.placeholder")}
              className="w-full mt-4 sm:mt-0 sm:w-[200px] focus-ring"
              options={[
                { label: "Browser TTS", value: "browser" },
                {
                  label: "ElevenLabs",
                  value: "elevenlabs"
                },
                {
                  label: "OpenAI TTS",
                  value: "openai"
                },
                {
                  label: "tldw server (audio/speech)",
                  value: "tldw"
                }
              ]}
              {...form.getInputProps("ttsProvider")}
            />
          </div>
        </div>
        {form.values.ttsProvider === "browser" && (
          <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
            <span className="text-gray-700 dark:text-neutral-50 ">
              {t("generalSettings.tts.ttsVoice.label")}
            </span>
            <div>
              <Select
                id={ids.browserVoice}
                aria-label={t("generalSettings.tts.ttsVoice.label") as string}
                placeholder={t("generalSettings.tts.ttsVoice.placeholder")}
                className="w-full mt-4 sm:mt-0 sm:w-[200px] focus-ring"
                options={data?.browserTTSVoices?.map((voice) => ({
                  label: `${voice.voiceName} - ${voice.lang}`.trim(),
                  value: voice.voiceName
                }))}
                {...form.getInputProps("voice")}
              />
            </div>
          </div>
        )}
        {form.values.ttsProvider === "elevenlabs" && (
          <>
            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                API Key
              </span>
              <Input.Password
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
                required
                {...form.getInputProps("elevenLabsApiKey")}
              />
            </div>

            {elevenLabsData && (
              <>
                <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
                  <span className="text-gray-700 dark:text-neutral-50">
                    TTS Voice
                  </span>
                  <Select
                    id={ids.elevenVoice}
                    aria-label="ElevenLabs voice"
                    options={elevenLabsData.voices.map((v) => ({
                      label: v.name,
                      value: v.voice_id
                    }))}
                    className="w-full mt-4 sm:mt-0 sm:w-[200px] focus-ring"
                    placeholder="Select a voice"
                    {...form.getInputProps("elevenLabsVoiceId")}
                  />
                </div>

                <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
                  <span className="text-gray-700 dark:text-neutral-50">
                    TTS Model
                  </span>
                  <Select
                    id={ids.elevenModel}
                    aria-label="ElevenLabs model"
                    className="w-full mt-4 sm:mt-0 sm:w-[200px] focus-ring"
                    placeholder="Select a model"
                    options={elevenLabsData.models.map((m) => ({
                      label: m.name,
                      value: m.model_id
                    }))}
                    {...form.getInputProps("elevenLabsModel")}
                  />
                </div>
                <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
                  <span className="text-gray-700 dark:text-neutral-50 ">
                    {t("generalSettings.tts.responseSplitting.label")}
                  </span>
                  <div>
                    <Select
                      placeholder={t(
                        "generalSettings.tts.responseSplitting.placeholder"
                      )}
                      className="w-full mt-4 sm:mt-0 sm:w-[200px]"
                      options={[
                        { label: "None", value: "none" },
                        { label: "Punctuation", value: "punctuation" },
                        { label: "Paragraph", value: "paragraph" }
                      ]}
                      {...form.getInputProps("responseSplitting")}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {form.values.ttsProvider === "openai" && (
          <>
            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                Base URL
              </span>
              <Input
                placeholder="http://localhost:5000/v1"
                className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
                required
                {...form.getInputProps("openAITTSBaseUrl")}
              />
            </div>

            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                API Key
              </span>
              <Input.Password
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
                {...form.getInputProps("openAITTSApiKey")}
              />
            </div>

            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                TTS Voice
              </span>
              <Select
                id={ids.openAiVoice}
                aria-label="OpenAI TTS voice"
                className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px] focus-ring"
                placeholder="Select a voice"
                options={[
                  { label: "alloy", value: "alloy" },
                  { label: "echo", value: "echo" },
                  { label: "fable", value: "fable" },
                  { label: "onyx", value: "onyx" },
                  { label: "nova", value: "nova" },
                  { label: "shimmer", value: "shimmer" }
                ]}
                {...form.getInputProps("openAITTSVoice")}
              />
            </div>

            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                TTS Model
              </span>
              <Select
                id={ids.openAiModel}
                aria-label="OpenAI TTS model"
                className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px] focus-ring"
                placeholder="Select a model"
                options={[
                  { label: "tts-1", value: "tts-1" },
                  { label: "tts-1-hd", value: "tts-1-hd" }
                ]}
                {...form.getInputProps("openAITTSModel")}
              />
            </div>
          </>
        )}
        {form.values.ttsProvider === "tldw" && (
          <>
            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                TTS Model
              </span>
              {tldwModels && tldwModels.length > 0 ? (
                <Select
                  id={ids.tldwModel}
                  aria-label="tldw TTS model"
                  className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px] focus-ring"
                  placeholder="Select a model"
                  options={tldwModels.map((m: TldwTtsModel) => ({
                    label: m.label,
                    value: m.id
                  }))}
                  {...form.getInputProps("tldwTtsModel")}
                />
              ) : (
                <Input
                  placeholder="kokoro"
                  className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
                  {...form.getInputProps("tldwTtsModel")}
                />
              )}
            </div>
            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                TTS Voice
              </span>
              {tldwVoices && tldwVoices.length > 0 ? (
                <Select
                  id={ids.tldwVoice}
                  aria-label="tldw TTS voice"
                  className="w-full mt-4 sm:mt-0 sm:w-[200px] focus-ring"
                  placeholder="Select a voice"
                  options={tldwVoices.map((v: TldwVoice) => ({
                    label: v.name || v.voice_id || v.id || "Voice",
                    value: v.voice_id || v.id || v.name || ""
                  }))}
                  {...form.getInputProps("tldwTtsVoice")}
                />
              ) : (
                <Input
                  placeholder="af_heart"
                  className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
                  {...form.getInputProps("tldwTtsVoice")}
                />
              )}
          </div>
            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                Response format
              </span>
              <Select
                id={ids.tldwResponseFormat}
                aria-label="tldw response format"
                className="w-full mt-4 sm:mt-0 sm:w-[200px] focus-ring"
                options={[
                  { label: "mp3", value: "mp3" },
                  { label: "opus", value: "opus" },
                  { label: "flac", value: "flac" },
                  { label: "wav", value: "wav" },
                  { label: "pcm", value: "pcm" }
                ]}
                {...form.getInputProps("tldwTtsResponseFormat")}
              />
            </div>
            <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
              <span className="text-gray-700 dark:text-neutral-50">
                Synthesis speed
              </span>
              <InputNumber
                id={ids.tldwSpeed}
                aria-label="tldw synthesis speed"
                placeholder="1"
                min={0.25}
                max={4}
                step={0.05}
                className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
                {...form.getInputProps("tldwTtsSpeed")}
              />
            </div>
          </>
        )}
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <label
            className="text-gray-700 dark:text-neutral-50 "
            htmlFor={ids.ssmlEnabled}>
            {t("generalSettings.tts.ssmlEnabled.label")}
          </label>
          <div>
            <Switch
              id={ids.ssmlEnabled}
              aria-label={t("generalSettings.tts.ssmlEnabled.label") as string}
              className="mt-4 sm:mt-0 focus-ring"
              {...form.getInputProps("ssmlEnabled", {
                type: "checkbox"
              })}
            />
          </div>
        </div>

        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <label
            className="text-gray-700 dark:text-neutral-50 "
            htmlFor={ids.removeReasoning}>
            {t("generalSettings.tts.removeReasoningTagTTS.label")}
          </label>
          <div>
            <Switch
              id={ids.removeReasoning}
              aria-label={
                t("generalSettings.tts.removeReasoningTagTTS.label") as string
              }
              className="mt-4 sm:mt-0 focus-ring"
              {...form.getInputProps("removeReasoningTagTTS", {
                type: "checkbox"
              })}
            />
          </div>
        </div>

        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <label
            className="text-gray-700 dark:text-neutral-50"
            htmlFor={ids.playbackSpeed}>
            Playback Speed
          </label>
          <InputNumber
            id={ids.playbackSpeed}
            aria-label="Playback speed"
            placeholder="1"
            className=" mt-4 sm:mt-0 !w-[300px] sm:w-[200px]"
            required
            {...form.getInputProps("playbackSpeed")}
          />
        </div>

        <div className="flex justify-end">
          <SaveButton btnType="submit" />
        </div>
      </form>
    </div>
  )
}
