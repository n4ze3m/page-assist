import { useQuery } from "@tanstack/react-query"
import React from "react"
import {
  getOllamaURL,
  systemPromptForNonRag,
  promptForRag,
  setOllamaURL as saveOllamaURL,
  setPromptForRag,
  setSystemPromptForNonRag
} from "~services/ollama"

import { Skeleton, Radio } from "antd"
import { useDarkMode } from "~hooks/useDarkmode"
import { SaveButton } from "~components/Common/SaveButton"

export const SettingsBody = () => {
  const [ollamaURL, setOllamaURL] = React.useState<string>("")
  const [systemPrompt, setSystemPrompt] = React.useState<string>("")
  const [ragPrompt, setRagPrompt] = React.useState<string>("")
  const [ragQuestionPrompt, setRagQuestionPrompt] = React.useState<string>("")
  const [selectedValue, setSelectedValue] = React.useState<"normal" | "rag">(
    "normal"
  )
  const { mode, toggleDarkMode } = useDarkMode()

  const { data, status } = useQuery({
    queryKey: ["sidebarSettings"],
    queryFn: async () => {
      const [ollamaURL, systemPrompt, ragPrompt] = await Promise.all([
        getOllamaURL(),
        systemPromptForNonRag(),
        promptForRag()
      ])

      return {
        url: ollamaURL,
        normalSystemPrompt: systemPrompt,
        ragSystemPrompt: ragPrompt.ragPrompt,
        ragQuestionPrompt: ragPrompt.ragQuestionPrompt
      }
    }
  })

  React.useEffect(() => {
    if (data) {
      setOllamaURL(data.url)
      setSystemPrompt(data.normalSystemPrompt)
      setRagPrompt(data.ragSystemPrompt)
      setRagQuestionPrompt(data.ragQuestionPrompt)
    }
  }, [data])

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    )
  }

  if (status === "error") {
    return <div>Error</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl">
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4">
        <h2 className="text-md mb-4 font-semibold dark:text-white">
          Ollama URL
        </h2>
        <input
          className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-black dark:text-white dark:placeholder-gray-400"
          value={ollamaURL}
          type="url"
          onChange={(e) => setOllamaURL(e.target.value)}
          placeholder="Enter Ollama URL here"
        />
        <div className="flex justify-end">
          <SaveButton
            onClick={() => {
              saveOllamaURL(ollamaURL)
            }}
          />
        </div>
      </div>
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4">
        <h2 className="text-md font-semibold dark:text-white">Prompt</h2>
        <div className="my-3 flex justify-end">
          <Radio.Group
            defaultValue={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}>
            <Radio.Button value="normal">Normal</Radio.Button>
            <Radio.Button value="rag">Rag</Radio.Button>
          </Radio.Group>
        </div>

        {selectedValue === "normal" && (
          <div>
            <span className="text-md font-thin text-gray-500 dark:text-gray-400">
              System Prompt
            </span>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-black dark:text-white dark:placeholder-gray-400"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <div className="flex justify-end">
              <SaveButton
                onClick={() => {
                  setSystemPromptForNonRag(systemPrompt)
                }}
              />
            </div>
          </div>
        )}

        {selectedValue === "rag" && (
          <div>
            <div className="mb-3">
              <span className="text-md font-thin text-gray-500 dark:text-gray-400">
                System Prompt
              </span>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-black dark:text-white dark:placeholder-gray-400"
                value={ragPrompt}
                onChange={(e) => setRagPrompt(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <span className="text-md  font-thin text-gray-500 dark:text-gray-400">
                Question Prompt
              </span>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-black dark:text-white dark:placeholder-gray-400"
                value={ragQuestionPrompt}
                onChange={(e) => setRagQuestionPrompt(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <SaveButton
                onClick={() => {
                  setPromptForRag(ragPrompt, ragQuestionPrompt)
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-300 dark:border-gray-700 rounded p-4">
        <h2 className="text-md mb-4 font-semibold dark:text-white">Theme</h2>
        {mode === "dark" ? (
          <button
            onClick={toggleDarkMode}
            className="select-none w-full rounded-lg border border-gray-900 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:border-gray-100 dark:text-white dark:hover:opacity-75 dark:focus:ring-dark dark:active:opacity-75 dark:disabled:pointer-events-none dark:disabled:opacity-50 dark:disabled:shadow-none">
            Light Mode
          </button>
        ) : (
          <button
            onClick={toggleDarkMode}
            className="select-none w-full rounded-lg border border-gray-900 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:border-gray-100 dark:text-white dark:hover:opacity-75 dark:focus:ring-dark dark:active:opacity-75 dark:disabled:pointer-events-none dark:disabled:opacity-50 dark:disabled:shadow-none">
            Dark Mode
          </button>
        )}
      </div>
    </div>
  )
}
