import { useStorage } from "@plasmohq/storage/hook"
import { InputNumber, Select, Switch } from "antd"
import { useTranslation } from "react-i18next"
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
