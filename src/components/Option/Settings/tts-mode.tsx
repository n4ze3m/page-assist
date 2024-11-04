import { SaveButton } from "@/components/Common/SaveButton"
import { getTTSSettings, setTTSSettings } from "@/services/tts"
import { useWebUI } from "@/store/webui"
import { useForm } from "@mantine/form"
import { useQuery } from "@tanstack/react-query"
import { Select, Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"

export const TTSModeSettings = ({ hideBorder }: { hideBorder?: boolean }) => {
  const { t } = useTranslation("settings")
  const { setTTSEnabled } = useWebUI()

  const form = useForm({
    initialValues: {
      ttsEnabled: false,
      ttsProvider: "",
      voice: "",
      ssmlEnabled: false
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
              options={[{ label: "Browser TTS", value: "browser" }]}
              {...form.getInputProps("ttsProvider")}
            />
          </div>
        </div>
        <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.tts.ttsVoice.label")}
          </span>
          <div>
            <Select
              placeholder={t("generalSettings.tts.ttsVoice.placeholder")}
              className="w-full mt-4 sm:mt-0 sm:w-[200px]"
              options={data?.browserTTSVoices?.map(
                (voice) => ({
                  label: `${voice.voiceName} - ${voice.lang}`.trim(),
                  value: voice.voiceName
                })
              )}
              {...form.getInputProps("voice")}
            />
          </div>
        </div>
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
