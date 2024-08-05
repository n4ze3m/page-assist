import { useQuery } from "@tanstack/react-query"
import { Collapse, Skeleton } from "antd"
import { useState } from "react"
import { SaveButton } from "~/components/Common/SaveButton"
import {
  getOpenAIBaseURL,
  setOpenAIBaseURL as saveOpenAIBaseURL,
  setOpenAIApiKey as saveOpenAIApiKey
} from "~/services/openai"
import { Trans, useTranslation } from "react-i18next"
import { ModelSettings } from "./model-settings"

export const SettingsOpenai = () => {
  const [openAIBaseURL, setOpenAIBaseURL] = useState<string>("")
  const [openAIApiKey, setOpenAIApiKey] = useState<string>("")

  const { t } = useTranslation("settings")

  const { status } = useQuery({
    queryKey: ["fetchOpenAIBaseURL"],
    queryFn: async () => {
      const [openAIBaseURL] = await Promise.all([getOpenAIBaseURL()])
      setOpenAIBaseURL(openAIBaseURL)
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
                {t("openAISettings.heading")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>
            <div className="mb-3">
              <label
                htmlFor="ollamaURL"
                className="text-sm font-medium dark:text-gray-200">
                {t("openAISettings.settings.openAIBaseURL.label")}
              </label>
              <input
                type="url"
                id="openAIBaseURL"
                value={openAIBaseURL}
                onChange={(e) => {
                  setOpenAIBaseURL(e.target.value)
                }}
                placeholder={t(
                  "openAISettings.settings.openAIBaseURL.placeholder"
                )}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor="ollamaURL"
                className="text-sm font-medium dark:text-gray-200">
                {t("openAISettings.settings.openAIApiKey.label")}
              </label>
              <input
                type="url"
                id="openAIApiKey"
                value={openAIApiKey}
                onChange={(e) => {
                  setOpenAIApiKey(e.target.value)
                }}
                placeholder={t(
                  "openAISettings.settings.openAIApiKey.placeholder"
                )}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end mb-3">
              <SaveButton
                onClick={() => {
                  saveOpenAIBaseURL(openAIBaseURL)
                  saveOpenAIApiKey(openAIApiKey)
                }}
                className="mt-2"
              />
            </div>
          </div>

          {/* <ModelSettings /> */}
        </div>
      )}
    </div>
  )
}
