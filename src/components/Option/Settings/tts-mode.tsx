import { SaveButton } from "@/components/Common/SaveButton"
import { getModels, getVoices } from "@/services/elevenlabs"
import { getTTSSettings, setTTSSettings } from "@/services/tts"
import { useWebUI } from "@/store/webui"
import { useForm } from "@mantine/form"
import { useQuery } from "@tanstack/react-query"
import { Input, message, Select, Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"

export const TTSModeSettings = ({ hideBorder }: { hideBorder?: boolean }) => {
  const { t } = useTranslation("settings")
  const { setTTSEnabled } = useWebUI()

  const form = useForm({
    initialValues: {
      ttsEnabled: false,
      ttsProvider: "",
      voice: "",
      ssmlEnabled: false,
      elevenLabsApiKey: "",
      elevenLabsVoiceId: "",
      elevenLabsModel: "",
      responseSplitting: ""
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
        console.log(e)
        message.error("Error fetching ElevenLabs data")
      }
      return null
    },
    enabled:
      form.values.ttsProvider === "elevenlabs" && !!form.values.elevenLabsApiKey
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
        })}
        className="space-y-4">
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.tts.ttsEnabled.label")}
          </span>
          <div>
            <Switch
              className="mt-4 sm:mt-0"
              {...form.getInputProps("ttsEnabled", {
                type: "checkbox"
              })}
            />
          </div>
        </div>
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.tts.ttsProvider.label")}
          </span>
          <div>
            <Select
              placeholder={t("generalSettings.tts.ttsProvider.placeholder")}
              className="w-full mt-4 sm:mt-0 sm:w-[200px]"
              options={[
                { label: "Browser TTS", value: "browser" },
                {
                  label: "ElevenLabs",
                  value: "elevenlabs"
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
                placeholder={t("generalSettings.tts.ttsVoice.placeholder")}
                className="w-full mt-4 sm:mt-0 sm:w-[200px]"
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
                    options={elevenLabsData.voices.map((v) => ({
                      label: v.name,
                      value: v.voice_id
                    }))}
                    className="w-full mt-4 sm:mt-0 sm:w-[200px]"
                    placeholder="Select a voice"
                    {...form.getInputProps("elevenLabsVoiceId")}
                  />
                </div>

                <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
                  <span className="text-gray-700 dark:text-neutral-50">
                    TTS Model
                  </span>
                  <Select
                    className="w-full mt-4 sm:mt-0 sm:w-[200px]"
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
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.tts.ssmlEnabled.label")}
          </span>
          <div>
            <Switch
              className="mt-4 sm:mt-0"
              {...form.getInputProps("ssmlEnabled", {
                type: "checkbox"
              })}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <SaveButton btnType="submit" />
        </div>
      </form>
    </div>
  )
}
