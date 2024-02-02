import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useMessage } from "~hooks/useMessage"
import {
  fetchModels,
  getOllamaURL,
  isOllamaRunning,
  setOllamaURL as saveOllamaURL
} from "~services/ollama"

export const EmptySidePanel = () => {
  const [ollamaURL, setOllamaURL] = useState<string>("")
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
      const models = await fetchModels()

      return {
        isOk,
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

  return (
    <div className="mx-auto sm:max-w-md px-4 mt-10">
      <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-white dark:bg-black shadow-sm">
        {(ollamaStatus === "pending" || isRefetching) && (
          <div className="inline-flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <p className="dark:text-gray-400 text-gray-900">
              Searching for your Ollama 🦙
            </p>
          </div>
        )}
        {!isRefetching && ollamaStatus === "success" ? (
          ollamaInfo.isOk ? (
            <div className="inline-flex  items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="dark:text-gray-400 text-gray-900">
                Ollama is running 🦙
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 justify-center items-center">
              <div className="inline-flex  space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="dark:text-gray-400 text-gray-900">
                  We couldn't find your Ollama 🦙
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
                className="bg-blue-500 mt-4 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                Retry
              </button>
            </div>
          )
        ) : null}

        {ollamaStatus === "success" && ollamaInfo.isOk && (
          <div className="mt-4">
            <p className="dark:text-gray-400 text-gray-900">Models:</p>

            <select
              onChange={(e) => {
                if (e.target.value === "") {
                  return
                }
                setSelectedModel(e.target.value)
              }}
              value={selectedModel}
              className="bg-gray-100 truncate w-full dark:bg-black dark:text-gray-100 rounded-md px-4 py-2 mt-2">
              <option key="0x" value={""}>
                Select a model
              </option>
              {ollamaInfo.models.map((model, index) => (
                <option key={index} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>

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
                  <span className="absolute text-white transition-opacity opacity-0 pointer-events-none top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 peer-checked:opacity-100 dark:text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      stroke="currentColor"
                      stroke-width="1">
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"></path>
                    </svg>
                  </span>
                </label>
                <label
                  className="mt-px font-light  cursor-pointer select-none text-gray-900 dark:text-gray-400"
                  htmlFor="check">
                  Chat with Current Page
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
