import { cleanUrl } from "@/libs/clean-url"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Select } from "antd"
import { Loader2, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useMessage } from "~/hooks/useMessage"
import {
  getAllModels,
  getOllamaURL,
  isOllamaRunning,
  setOllamaURL as saveOllamaURL,
  fetchChatModels
} from "~/services/ollama"

export const EmptySidePanel = () => {
  const [ollamaURL, setOllamaURL] = useState<string>("")
  const { t } = useTranslation(["playground", "common"])
  const queryClient = useQueryClient()
  const [checkOllamaStatus] = useStorage("checkOllamaStatus", true)

  const {
    data: ollamaInfo,
    status: ollamaStatus,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ["ollamaStatus", checkOllamaStatus],
    queryFn: async () => {
      const ollamaURL = await getOllamaURL()
      const isOk = await isOllamaRunning()
      const models = await fetchChatModels({ returnEmpty: false })
      queryClient.invalidateQueries({
        queryKey: ["getAllModelsForSelect"]
      })
      return {
        isOk: checkOllamaStatus ? isOk : true,
        models,
        ollamaURL
      }
    }
  })

  useEffect(() => {
    if (ollamaInfo?.ollamaURL) {
      setOllamaURL(ollamaInfo.ollamaURL)
    }
  }, [ollamaInfo])

  const { setSelectedModel, selectedModel, chatMode, setChatMode } =
    useMessage()
  const renderSection = () => {
    return (
      <div className="mt-4">
        <Select
          onChange={(e) => {
            setSelectedModel(e)
            localStorage.setItem("selectedModel", e)
          }}
          value={selectedModel}
          size="large"
          filterOption={(input, option) =>
            option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
            option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
          showSearch
          placeholder={t("common:selectAModel")}
          style={{ width: "100%" }}
          className="mt-4"
          options={ollamaInfo.models?.map((model) => ({
            label: model.name,
            value: model.model
          }))}
        />

        <div className="mt-4">
          <div className="inline-flex items-center">
            <label
              className="relative flex items-center p-3 rounded-full cursor-pointer"
              htmlFor="check">
              <input
                type="checkbox"
                checked={chatMode === "rag"}
                onChange={(e) => {
                  setChatMode(e.target.checked ? "rag" : "normal")
                }}
                className="before:content[''] peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-gray-200 transition-all before:absolute before:top-2/4 before:left-2/4 before:block before:h-12 before:w-12 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity"
                id="check"
              />
              <span className="absolute text-white transition-opacity opacity-0 pointer-events-none top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 peer-checked:opacity-100 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"></path>
                </svg>
              </span>
            </label>
            <label
              className="mt-px font-light  cursor-pointer select-none text-gray-900 dark:text-gray-400"
              htmlFor="check">
              {t("common:chatWithCurrentPage")}
            </label>
          </div>
        </div>
      </div>
    )
  }

  if (!checkOllamaStatus) {
    return (
      <div className="mx-auto sm:max-w-md px-4 mt-10">
        <div className="rounded-lg justify-center items-center flex flex-col border dark:border-gray-700 p-8 bg-white dark:bg-[#262626] shadow-sm">
          <div className="inline-flex items-center space-x-2">
            <p className="dark:text-gray-400 text-gray-900">
              <span>👋</span>
              {t("welcome")}
            </p>
          </div>
          {ollamaStatus === "pending" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {ollamaStatus === "success" && ollamaInfo.isOk && renderSection()}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto sm:max-w-md px-4 mt-10">
      <div className="rounded-lg justify-center items-center flex flex-col border dark:border-gray-700 p-8 bg-white dark:bg-[#262626] shadow-sm">
        {(ollamaStatus === "pending" || isRefetching) && (
          <div className="inline-flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <p className="dark:text-gray-400 text-gray-900">
              {t("ollamaState.searching")}
            </p>
          </div>
        )}
        {!isRefetching && ollamaStatus === "success" ? (
          ollamaInfo.isOk ? (
            <div className="inline-flex  items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="dark:text-gray-400 text-gray-900">
                {t("ollamaState.running")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 justify-center items-center">
              <div className="inline-flex  space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="dark:text-gray-400 text-gray-900">
                  {t("ollamaState.notRunning")}
                </p>
              </div>

              <input
                className="bg-gray-100 dark:bg-black dark:text-gray-100 rounded-md px-4 py-2 mt-2 w-full"
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
                  <p className="text-xs text-gray-700 dark:text-gray-400 mb-4 text-center">
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

        {ollamaStatus === "success" && ollamaInfo.isOk && renderSection()}
      </div>
    </div>
  )
}
