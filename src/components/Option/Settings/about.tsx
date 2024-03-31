import { getOllamaURL } from "~/services/ollama"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "antd"
import { cleanUrl } from "@/libs/clean-url"

export const AboutApp = () => {
  const { t } = useTranslation("settings")

  const { data, status } = useQuery({
    queryKey: ["fetchOllamURL"],
    queryFn: async () => {
      const chromeVersion = chrome.runtime.getManifest().version
      try {
        const url = await getOllamaURL()
        const req = await fetch(`${cleanUrl(url)}/api/version`)

        if (!req.ok) {
          return {
            ollama: "N/A",
            chromeVersion
          }
        }

        const res = (await req.json()) as { version: string }
        return {
          ollama: res.version,
          chromeVersion
        }
      } catch {
        return {
          ollama: "N/A",
          chromeVersion
        }
      }
    }
  })

  return (
    <div className="flex flex-col space-y-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}
      {status === "success" && (
        <div className="flex flex-col space-y-4">
          <div>
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("about.heading")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>
          </div>

          <div>
            <div className="flex flex-col space-y-6">
              <div className="flex gap-6">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("about.chromeVersion")}
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {data.chromeVersion}
                </span>
              </div>

              <div className="flex gap-6">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("about.ollamaVersion")}
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {data.ollama}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("about.support")}
            </p>

            <div className="flex gap-2">
              <a
                href="https://ko-fi.com/n4ze3m"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 dark:text-blue-400 border dark:border-gray-600 px-2.5 py-2 rounded-md">
                {t("about.koFi")}
              </a>

              <a
                href="https://github.com/sponsors/n4ze3m"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 dark:text-blue-400 border dark:border-gray-600 px-2.5 py-2 rounded-md">
                {t("about.githubSponsor")}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
