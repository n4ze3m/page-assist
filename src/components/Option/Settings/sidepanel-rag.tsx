import { useStorage } from "@plasmohq/storage/hook"
import { InputNumber, Switch } from "antd"
import { useTranslation } from "react-i18next"

export const SidepanelRag = ({ hideBorder }: { hideBorder?: boolean }) => {
  const { t } = useTranslation("settings")
  const [chatWithWebsiteEmbedding, setChatWithWebsiteEmbedding] = useStorage(
    "chatWithWebsiteEmbedding",
    true
  )
  const [maxWebsiteContext, setMaxWebsiteContext] = useStorage(
    "maxWebsiteContext",
    4028
  )

  return (
    <div>
      <div className="mb-5">
        <h2
          className={`${
            !hideBorder ? "text-base font-semibold leading-7" : "text-md"
          } text-gray-900 dark:text-white`}>
          {t("generalSettings.sidepanelRag.heading")}
        </h2>
        {!hideBorder && (
          <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
        )}
      </div>
      <div className={`${
        !hideBorder ? "text-sm" : ""
      } space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <span className="text-gray-700  truncate dark:text-neutral-50">
            {t("generalSettings.sidepanelRag.ragEnabled.label")}
          </span>
          <div>
            <Switch
              className="mt-4 sm:mt-0"
              checked={chatWithWebsiteEmbedding}
              onChange={(checked) => setChatWithWebsiteEmbedding(checked)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <span className="text-gray-700 truncate dark:text-neutral-50">
            {t("generalSettings.sidepanelRag.maxWebsiteContext.label")}
          </span>
          <div>
            <InputNumber
              disabled={chatWithWebsiteEmbedding}
              className="mt-4 sm:mt-0"
              value={maxWebsiteContext}
              onChange={(value) => setMaxWebsiteContext(value)}
              placeholder={t(
                "generalSettings.sidepanelRag.maxWebsiteContext.placeholder"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
