import { getOllamaURL } from "~/services/ollama"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "antd"
import { cleanUrl } from "@/libs/clean-url"
import { Descriptions } from "antd"
import fetcher from "@/libs/fetcher"

export const AboutApp = () => {
  const { t } = useTranslation("settings")

  const { data, status } = useQuery({
    queryKey: ["fetchOllamURL"],
    queryFn: async () => {
      const chromeVersion = browser.runtime.getManifest().version
      try {
        const url = await getOllamaURL()
        const req = await fetcher(`${cleanUrl(url)}/api/version`)

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
          <Descriptions
            title={t("about.heading")}
            column={1}
            size="middle"
            items={[
              {
                key: 1,
                label: t("about.chromeVersion"),
                children: data.chromeVersion
              },
              {
                key: 1,
                label: t("about.ollamaVersion"),
                children: data.ollama
              },
              {
                key: 2,
                label: "Community",
                children: (
                  <a
                    href="https://discord.com/invite/bu54382uBd"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 dark:text-blue-400">
                    Discord Server
                  </a>
                )
              },
              {
                key: 3,
                label: "X (formerly Twitter)",
                children: (
                  <a
                    href="https://twitter.com/page_assist"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 dark:text-blue-400">
                    @page_assist
                  </a>
                )
              }
            ]}
          />
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-4">
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
