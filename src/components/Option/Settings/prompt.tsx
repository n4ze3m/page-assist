import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { SaveButton } from "~components/Common/SaveButton"
import {
  setSystemPromptForNonRagOption,
  systemPromptForNonRagOption
} from "~services/ollama"

export const SettingPrompt = () => {
  const [ollamaPrompt, setOllamaPrompt] = useState<string>("")
  const { data: ollamaInfo } = useQuery({
    queryKey: ["fetchOllaPrompt"],
    queryFn: async () => {
      const prompt = await systemPromptForNonRagOption()

      return {
        prompt
      }
    }
  })

  useEffect(() => {
    if (ollamaInfo?.prompt) {
      setOllamaPrompt(ollamaInfo.prompt)
    }
  }, [ollamaInfo])

  return (
    <div className="">
      <div>
        <label htmlFor="ollamaPrompt" className="text-sm font-medium dark:text-gray-200">
            System Prompt
        </label>
      <textarea
        value={ollamaPrompt}
        rows={5}
        id="ollamaPrompt"
        placeholder="Your System Prompt"
        onChange={(e) => {
          setOllamaPrompt(e.target.value)
        }}
        className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
      />
      </div>

      <div className="flex justify-end">
      <SaveButton
        onClick={() => {
          setSystemPromptForNonRagOption(ollamaPrompt)
        }}
        className="mt-2"
      />
      </div>
    </div>
  )
}
