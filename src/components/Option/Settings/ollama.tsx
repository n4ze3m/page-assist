import { useQuery } from "@tanstack/react-query"
import { Collapse, Skeleton } from "antd"
import { useState } from "react"
import { SaveButton } from "~/components/Common/SaveButton"
import { getOllamaURL, setOllamaURL as saveOllamaURL } from "~/services/ollama"
import { Trans, useTranslation } from "react-i18next"
import { AdvanceOllamaSettings } from "@/components/Common/Settings/AdvanceOllamaSettings"
import { ModelSettings } from "./model-settings"

export const SettingsOllama = () => {
  const [ollamaURL, setOllamaURL] = useState<string>("")

  const { t } = useTranslation("settings")

  const { status } = useQuery({
    queryKey: ["fetchOllamURL"],
    queryFn: async () => {
      const [ollamaURL] = await Promise.all([getOllamaURL()])
      setOllamaURL(ollamaURL)
      return {}
    }
  })

  return (
    <div className="flex flex-col space-y-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}
      {status === "success" && (
        <div className="flex flex-col space-y-6">
          <div>
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("ollamaSettings.heading")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>
            <div className="mb-3">
              <label
                htmlFor="ollamaURL"
                className="text-sm font-medium dark:text-gray-200">
                {t("ollamaSettings.settings.ollamaUrl.label")}
              </label>
              <input
                type="url"
                id="ollamaURL"
                value={ollamaURL}
                onChange={(e) => {
                  setOllamaURL(e.target.value)
                }}
                placeholder={t("ollamaSettings.settings.ollamaUrl.placeholder")}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end mb-3">
              <SaveButton
                onClick={() => {
                  saveOllamaURL(ollamaURL)
                }}
                className="mt-2"
              />
            </div>
            <Collapse
              size="small"
              items={[
                {
                  key: "1",
                  label: (
                    <div>
                      <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                        {t("ollamaSettings.settings.advanced.label")}
                      </h2>
                      <p className="text-xs text-gray-700 dark:text-gray-400 mb-4">
                        <Trans
                          i18nKey="settings:ollamaSettings.settings.advanced.help"
                          components={{
                            anchor: (
                              <a
                                href="https://github.com/n4ze3m/page-assist/blob/main/docs/connection-issue.md#solutions"
                                target="__blank"
                                className="text-blue-600 dark:text-blue-400"></a>
                            )
                          }}
                        />
                      </p>
                    </div>
                  ),
                  children: <AdvanceOllamaSettings />
                }
              ]}
            />
          </div>

          <ModelSettings />
        </div>
      )}
    </div>
  )
}
