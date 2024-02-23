import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { SaveButton } from "~components/Common/SaveButton"
import { getOllamaURL, setOllamaURL as saveOllamaURL } from "~services/ollama"

export const SettingsOllama = () => {
  const [ollamaURL, setOllamaURL] = useState<string>("")
  const { data: ollamaInfo } = useQuery({
    queryKey: ["fetchOllamURL"],
    queryFn: async () => {
      const ollamaURL = await getOllamaURL()
      return {
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
    <div className="">
      <div>
        <label
          htmlFor="ollamaURL"
          className="text-sm font-medium dark:text-gray-200">
          Ollama URL
        </label>
        <input
          type="url"
          id="ollamaURL"
          value={ollamaURL}
          onChange={(e) => {
            setOllamaURL(e.target.value)
          }}
          placeholder="Your Ollama URL"
          className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
        />
      </div>
      <div className="flex justify-end">
        <SaveButton
          onClick={() => {
            saveOllamaURL(ollamaURL)
          }}
          className="mt-2"
        />
      </div>
    </div>
  )
}
