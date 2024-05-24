import { useStorage } from "@plasmohq/storage/hook"
import { Input, Switch } from "antd"
import { useTranslation } from "react-i18next"

export const AdvanceOllamaSettings = () => {
  const [urlRewriteEnabled, setUrlRewriteEnabled] = useStorage(
    "urlRewriteEnabled",
    false
  )

  const [rewriteUrl, setRewriteUrl] = useStorage(
    "rewriteUrl",
    "http://127.0.0.1:11434"
  )
  const { t } = useTranslation("settings")

  return (
    <div className="space-y-4">
      <div className="flex sm:flex-row flex-col space-y-4 sm:space-y-0 sm:justify-between">
        <span className="text-gray-500 dark:text-neutral-50 ">
          {t("ollamaSettings.settings.advanced.urlRewriteEnabled.label")}
        </span>
        <div>
          <Switch
            className="mt-4 sm:mt-0"
            checked={urlRewriteEnabled}
            onChange={(checked) => setUrlRewriteEnabled(checked)}
          />
        </div>
      </div>
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:justify-between">
        <span className="text-gray-500 dark:text-neutral-50 mb-3">
          {t("ollamaSettings.settings.advanced.rewriteUrl.label")}
        </span>
        <div>
          <Input
            className="w-full"
            value={rewriteUrl}
            disabled={!urlRewriteEnabled}
            placeholder={t(
              "ollamaSettings.settings.advanced.rewriteUrl.placeholder"
            )}
            onChange={(e) => setRewriteUrl(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
