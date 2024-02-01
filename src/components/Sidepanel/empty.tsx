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

  const { setSelectedModel, selectedModel } = useMessage()

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
              className="bg-gray-100 w-full dark:bg-black dark:text-gray-100 rounded-md px-4 py-2 mt-2">
              <option value={""}>Select a model</option>
              {ollamaInfo.models.map((model) => (
                <option value={model.name}>{model.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
