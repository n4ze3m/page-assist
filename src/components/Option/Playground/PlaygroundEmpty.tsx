import { cleanUrl } from "@/libs/clean-url"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuery } from "@tanstack/react-query"
import { RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import {
  getOllamaURL,
  isOllamaRunning,
  setOllamaURL as saveOllamaURL
} from "~/services/ollama"

export const PlaygroundEmpty = () => {
  const [ollamaURL, setOllamaURL] = useState<string>("")
  const { t } = useTranslation(["playground", "common"])

  const [checkOllamaStatus] = useStorage("checkOllamaStatus", true)

  const {
    data: ollamaInfo,
    status: ollamaStatus,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ["ollamaStatus"],
    queryFn: async () => {
      const ollamaURL = await getOllamaURL()
      const isOk = await isOllamaRunning()

      if (ollamaURL) {
        saveOllamaURL(ollamaURL)
      }

      return {
        isOk,
        ollamaURL
      }
    },
    enabled: checkOllamaStatus
  })

  useEffect(() => {
    if (ollamaInfo?.ollamaURL) {
      setOllamaURL(ollamaInfo.ollamaURL)
    }
  }, [ollamaInfo])


  if (!checkOllamaStatus) {
    return (
      <div className="mx-auto sm:max-w-xl px-4 mt-10">
        <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-gray-50 dark:bg-[#262626] dark:border-gray-600">
          <h1 className="text-sm  font-medium text-center text-gray-500 dark:text-gray-400 flex gap-3 items-center justify-center">
            <span >👋</span>
            <span className="text-gray-700 dark:text-gray-300">
              {t("welcome")}
            </span>
          </h1>
        </div>
      </div>
    )
  }
  return (
    <div className="mx-auto sm:max-w-xl px-4 mt-10">
      <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-gray-50 dark:bg-[#262626]  dark:border-gray-600">
        {(ollamaStatus === "pending" || isRefetching) && (
          <div className="inline-flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="dark:text-gray-400 text-gray-900">
              {t("ollamaState.searching")}
            </p>
          </div>
        )}
        {!isRefetching && ollamaStatus === "success" ? (
          ollamaInfo.isOk ? (
            <div className="inline-flex  items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="dark:text-gray-400 text-gray-900">
                {t("ollamaState.running")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 justify-center items-center">
              <div className="inline-flex  space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <p className="dark:text-gray-400 text-gray-900">
                  {t("ollamaState.notRunning")}
                </p>
              </div>

              <input
                className="bg-gray-100 dark:bg-[#262626] dark:text-gray-100 rounded-md px-4 py-2 mt-2 w-full"
                type="url"
                value={ollamaURL}
                onChange={(e) => setOllamaURL(e.target.value)}
              />

              <button
                onClick={() => {
                  saveOllamaURL(ollamaURL)
                  refetch()
                }}
                className="inline-flex mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
                <RotateCcw className="h-4 w-4 mr-3" />
                {t("common:retry")}
              </button>

              {ollamaURL &&
                cleanUrl(ollamaURL) !== "http://127.0.0.1:11434" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                    <Trans
                      i18nKey="playground:ollamaState.connectionError"
                      components={{
                        anchor: (
                          <a
                            href="https://github.com/n4ze3m/page-assist/blob/main/docs/connection-issue.md"
                            target="__blank"
                            className="text-blue-600 dark:text-blue-400"></a>
                        )
                      }}
                    />
                  </p>
                )}
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
