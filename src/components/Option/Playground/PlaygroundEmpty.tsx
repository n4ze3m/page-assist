import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useMessage } from "~hooks/useMessage"
import { useMessageOption } from "~hooks/useMessageOption"
import {
  getOllamaURL,
  isOllamaRunning,
  setOllamaURL as saveOllamaURL
} from "~services/ollama"

export const PlaygroundEmpty = () => {
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

      return {
        isOk,
        ollamaURL
      }
    }
  })

  useEffect(() => {
    if (ollamaInfo?.ollamaURL) {
      setOllamaURL(ollamaInfo.ollamaURL)
    }
  }, [ollamaInfo])

  return (
    <div className="mx-auto sm:max-w-xl px-4 mt-10">
      <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-white dark:bg-[#262626] shadow-sm dark:border-gray-600">
        {(ollamaStatus === "pending" || isRefetching) && (
          <div className="inline-flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <p className="dark:text-gray-400 text-gray-900">
              Searching for Your Ollama 🦙
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
                  Unable to connect to Ollama 🦙
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
                className="bg-pink-500 mt-4 hover:bg-pink-600 text-white px-4 py-2 rounded-md dark:bg-pink-600 dark:hover:bg-pink-700">
                Retry
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
