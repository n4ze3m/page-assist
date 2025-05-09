import React from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { useDarkMode } from "~/hooks/useDarkmode"
import { useTranslation } from "react-i18next"
import { SaveButton } from "~/components/Common/SaveButton"
import { useStorage } from "@plasmohq/storage/hook"
import { useDebounce } from "~/hooks/useDebounce"

export const ThemesSettings: React.FC = () => {
  const { t } = useTranslation(["settings", "common"])
  const { mode, toggleDarkMode } = useDarkMode()
  const [cssUrl, setCssUrl] = useStorage("customCssUrl", "")
  const [customCss, setCustomCss] = useStorage("customCss", "")

  // Add local state for immediate input updates
  const [localCssUrl, setLocalCssUrl] = React.useState(cssUrl)
  const [localCustomCss, setLocalCustomCss] = React.useState(customCss)

  // Debounce the values
  const debouncedCssUrl = useDebounce(localCssUrl, 500)
  const debouncedCustomCss = useDebounce(localCustomCss, 500)

  // Update storage when debounced values change
  React.useEffect(() => {
    setCssUrl(debouncedCssUrl)
  }, [debouncedCssUrl])

  React.useEffect(() => {
    setCustomCss(debouncedCustomCss)
  }, [debouncedCustomCss])



  return (
    <div className="flex flex-col space-y-3">
      <div className="flex flex-col space-y-6">
        <div>
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
              {t("themes.title")}
            </h2>
            <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
          </div>


          <div className="flex flex-row justify-between">
            <label htmlFor="darkMode" className="text-sm font-medium dark:text-gray-200">
              {t("generalSettings.settings.darkMode.label")}
            </label>

            <button
              id="darkMode"
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

          <div className="mb-3">
            <label htmlFor="cssUrl" className="text-sm font-medium dark:text-gray-200">
              {t("themes.cssUrl")}
            </label>
            <input
              type="url"
              id="cssUrl"
              value={localCssUrl}
              onChange={(e) => setLocalCssUrl(e.target.value)}
              placeholder={t("themes.placeholderUrl")}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="customCss" className="text-sm font-medium dark:text-gray-200">
              {t("themes.customCss")}
            </label>
            <textarea
              id="customCss"
              value={localCustomCss}
              onChange={(e) => setLocalCustomCss(e.target.value)}
              placeholder={t("themes.placeholderCss")}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
              rows={10}
            />
          </div>

          <div className="flex justify-end">
            <SaveButton text={t("themes.apply")} textOnSave={t("themes.applied")} btnType="button" onClick={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}