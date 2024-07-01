import { useStorage } from "@plasmohq/storage/hook"
import { useQuery } from "@tanstack/react-query"
import { Alert, Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { getChromeAISupported } from "@/utils/chrome"
import Markdown from "@/components/Common/Markdown"

export const ChromeApp = () => {
  const { t } = useTranslation("chrome")
  const [chromeAIStatus, setChromeAIStatus] = useStorage(
    "chromeAIStatus",
    false
  )
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")

  const { status, data } = useQuery({
    queryKey: ["fetchChromeAIInfo"],
    queryFn: async () => {
      const data = await getChromeAISupported()
      return data
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
                {t("heading")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>

            <div className="flex mb-3 flex-row justify-between">
              <div className="inline-flex items-center gap-2">
                <span className="text-gray-700 text-sm dark:text-neutral-50">
                  {t("status.label")}
                </span>
              </div>

              <Switch
                disabled={data !== "success"}
                checked={chromeAIStatus}
                onChange={(value) => {
                  setChromeAIStatus(value)
                  if (
                    !value &&
                    selectedModel === "chrome::gemini-nano::page-assist"
                  ) {
                    setSelectedModel(null)
                  }
                }}
              />
            </div>
            {data !== "success" && (
              <div className="space-y-3">
                <Alert message={t(`error.${data}`)} type="error" showIcon />
                <div className=" w-full">
                  <Markdown
                    className="text-sm text-gray-700 dark:text-neutral-50 leading-7 text-justify"
                    message={t("errorDescription")}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
