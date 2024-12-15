import { useQueryClient } from "@tanstack/react-query"
import { useDarkMode } from "~/hooks/useDarkmode"
import { useMessageOption } from "~/hooks/useMessageOption"
import { PageAssitDatabase } from "@/db"
import { Select, Switch } from "antd"
import { SUPPORTED_LANGUAGES } from "~/utils/supporetd-languages"
import { MoonIcon, SunIcon } from "lucide-react"
import { SearchModeSettings } from "./search-mode"
import { useTranslation } from "react-i18next"
import { useI18n } from "@/hooks/useI18n"
import { TTSModeSettings } from "./tts-mode"
import {
  exportPageAssistData,
  importPageAssistData
} from "@/libs/export-import"
import { useStorage } from "@plasmohq/storage/hook"

export const GeneralSettings = () => {
  const { clearChat } = useMessageOption()

  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )
  const [copilotResumeLastChat, setCopilotResumeLastChat] = useStorage(
    "copilotResumeLastChat",
    false
  )

  const [webUIResumeLastChat, setWebUIResumeLastChat] = useStorage(
    "webUIResumeLastChat",
    false
  )

  const [restoreLastChatModel, setRestoreLastChatModel] = useStorage(
    "restoreLastChatModel",
    false
  )

  const [generateTitle, setGenerateTitle] = useStorage("titleGenEnabled", false)

  const [hideCurrentChatModelSettings, setHideCurrentChatModelSettings] =
    useStorage("hideCurrentChatModelSettings", false)

  const [sendNotificationAfterIndexing, setSendNotificationAfterIndexing] =
    useStorage("sendNotificationAfterIndexing", false)

  const [checkOllamaStatus, setCheckOllamaStatus] = useStorage(
    "checkOllamaStatus",
    true
  )

  const queryClient = useQueryClient()

  const { mode, toggleDarkMode } = useDarkMode()
  const { t } = useTranslation("settings")
  const { changeLocale, locale, supportLanguage } = useI18n()

  return (
    <dl className="flex flex-col space-y-6 text-sm">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("generalSettings.title")}
        </h2>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
      </div>
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
        />
      </div>
      <div className="flex flex-row justify-between">
        <span className="text-gray-700   dark:text-neutral-50">
          {t("generalSettings.settings.language.label")}
        </span>

        <Select
          placeholder={t("generalSettings.settings.language.placeholder")}
          allowClear
          showSearch
          style={{ width: "200px" }}
          options={supportLanguage}
          value={locale}
          filterOption={(input, option) =>
            option!.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
            option!.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
          onChange={(value) => {
            changeLocale(value)
          }}
        />
      </div>
      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.copilotResumeLastChat.label")}
          </span>
        </div>
        <Switch
          checked={copilotResumeLastChat}
          onChange={(checked) => setCopilotResumeLastChat(checked)}
        />
      </div>
      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.webUIResumeLastChat.label")}
          </span>
        </div>
        <Switch
          checked={webUIResumeLastChat}
          onChange={(checked) => setWebUIResumeLastChat(checked)}
        />
      </div>
      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.hideCurrentChatModelSettings.label")}
          </span>
        </div>

        <Switch
          checked={hideCurrentChatModelSettings}
          onChange={(checked) => setHideCurrentChatModelSettings(checked)}
        />
      </div>
      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.restoreLastChatModel.label")}
          </span>
        </div>

        <Switch
          checked={restoreLastChatModel}
          onChange={(checked) => setRestoreLastChatModel(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.sendNotificationAfterIndexing.label")}
          </span>
        </div>

        <Switch
          checked={sendNotificationAfterIndexing}
          onChange={setSendNotificationAfterIndexing}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.generateTitle.label")}
          </span>
        </div>

        <Switch
          checked={generateTitle}
          onChange={(checked) => setGenerateTitle(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700   dark:text-neutral-50">
            {t("generalSettings.settings.ollamaStatus.label")}
          </span>
        </div>

        <Switch
          checked={checkOllamaStatus}
          onChange={(checked) => setCheckOllamaStatus(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <span className="text-gray-700 dark:text-neutral-50 ">
          {t("generalSettings.settings.darkMode.label")}
        </span>

        <button
          onClick={toggleDarkMode}
          className={`inline-flex mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm  dark:bg-white dark:text-gray-800 disabled:opacity-50 `}>
          {mode === "dark" ? (
            <SunIcon className="w-4 h-4 mr-2" />
          ) : (
            <MoonIcon className="w-4 h-4 mr-2" />
          )}
          {mode === "dark"
            ? t("generalSettings.settings.darkMode.options.light")
            : t("generalSettings.settings.darkMode.options.dark")}
        </button>
      </div>
      <SearchModeSettings />
      <TTSModeSettings />
      <div>
        <div className="mb-5">
          <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
            {t("generalSettings.system.heading")}
          </h2>
          <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
        </div>
       
        <div className="flex flex-row mb-3 justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.system.export.label")}
          </span>
          <button
            onClick={exportPageAssistData}
            className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer">
            {t("generalSettings.system.export.button")}
          </button>
        </div>
        <div className="flex flex-row mb-3 justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.system.import.label")}
          </span>
          <label
            htmlFor="import"
            className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer">
            {t("generalSettings.system.import.button")}
          </label>
          <input
            type="file"
            accept=".json"
            id="import"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                importPageAssistData(e.target.files[0])
              }
            }}
          />
        </div>

        <div className="flex flex-row mb-3 justify-between">
          <span className="text-gray-700 dark:text-neutral-50 ">
            {t("generalSettings.system.deleteChatHistory.label")}
          </span>

          <button
            onClick={async () => {
              const confirm = window.confirm(
                t("generalSettings.system.deleteChatHistory.confirm")
              )

              if (confirm) {
                const db = new PageAssitDatabase()
                await db.deleteAllChatHistory()
                queryClient.invalidateQueries({
                  queryKey: ["fetchChatHistory"]
                })
                clearChat()
                try {
                  await browser.storage.sync.clear()
                  await browser.storage.local.clear()
                  await browser.storage.session.clear()
                } catch (e) {
                  console.log("Error clearing storage:", e)
                }
              }
            }}
            className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-200 px-4 py-2 rounded-md">
            {t("generalSettings.system.deleteChatHistory.button")}
          </button>
        </div>
      </div>
    </dl>
  )
}
