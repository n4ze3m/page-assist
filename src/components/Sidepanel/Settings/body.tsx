import { useMutation, useQuery } from "@tanstack/react-query"
import React from "react"
import {
  getOllamaURL,
  systemPromptForNonRag,
  promptForRag,
  setOllamaURL as saveOllamaURL,
  setPromptForRag,
  setSystemPromptForNonRag,
  getAllModels,
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  saveForRag
} from "~services/ollama"

import { Skeleton, Radio, Select, Form, InputNumber } from "antd"
import { useDarkMode } from "~hooks/useDarkmode"
import { SaveButton } from "~components/Common/SaveButton"
import { SUPPORTED_LANGUAGES } from "~utils/supporetd-languages"
import { useMessage } from "~hooks/useMessage"
import { MoonIcon, SunIcon } from "lucide-react"

export const SettingsBody = () => {
  const [ollamaURL, setOllamaURL] = React.useState<string>("")
  const [systemPrompt, setSystemPrompt] = React.useState<string>("")
  const [ragPrompt, setRagPrompt] = React.useState<string>("")
  const [ragQuestionPrompt, setRagQuestionPrompt] = React.useState<string>("")
  const [selectedValue, setSelectedValue] = React.useState<"normal" | "rag">(
    "normal"
  )

  const { speechToTextLanguage, setSpeechToTextLanguage } = useMessage()
  const { mode, toggleDarkMode } = useDarkMode()

  const { data, status } = useQuery({
    queryKey: ["sidebarSettings"],
    queryFn: async () => {
      const [
        ollamaURL,
        systemPrompt,
        ragPrompt,
        allModels,
        chunkOverlap,
        chunkSize,
        defaultEM
      ] = await Promise.all([
        getOllamaURL(),
        systemPromptForNonRag(),
        promptForRag(),
        getAllModels(),
        defaultEmbeddingChunkOverlap(),
        defaultEmbeddingChunkSize(),
        defaultEmbeddingModelForRag()
      ])

      return {
        url: ollamaURL,
        normalSystemPrompt: systemPrompt,
        ragSystemPrompt: ragPrompt.ragPrompt,
        ragQuestionPrompt: ragPrompt.ragQuestionPrompt,
        models: allModels,
        chunkOverlap,
        chunkSize,
        defaultEM
      }
    }
  })

  const { mutate: saveRAG, isPending: isSaveRAGPending } = useMutation({
    mutationFn: async (data: {
      model: string
      chunkSize: number
      overlap: number
    }) => {
      await saveForRag(data.model, data.chunkSize, data.overlap)
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
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
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
              className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
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
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
                value={ragPrompt}
                onChange={(e) => setRagPrompt(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <span className="text-md  font-thin text-gray-500 dark:text-gray-400">
                Question Prompt
              </span>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
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

      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md mb-4 font-semibold dark:text-white">
          Ollama URL
        </h2>
        <input
          className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
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

      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md mb-4 font-semibold dark:text-white">
          RAG Configuration
        </h2>
        <Form
          onFinish={(data) => {
            saveRAG({
              model: data.defaultEM,
              chunkSize: data.chunkSize,
              overlap: data.chunkOverlap
            })
          }}
          initialValues={{
            chunkSize: data.chunkSize,
            chunkOverlap: data.chunkOverlap,
            defaultEM: data.defaultEM
          }}>
          <Form.Item
            name="defaultEM"
            label="Embedding Model"
            help="Highly recommended to use embedding models like `nomic-embed-text`."
            rules={[{ required: true, message: "Please select a model!" }]}>
            <Select
              size="large"
              filterOption={(input, option) =>
                option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
                option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              showSearch
              placeholder="Select a model"
              style={{ width: "100%" }}
              className="mt-4"
              options={data.models?.map((model) => ({
                label: model.name,
                value: model.model
              }))}
            />
          </Form.Item>

          <Form.Item
            name="chunkSize"
            label="Chunk Size"
            rules={[
              { required: true, message: "Please input your chunk size!" }
            ]}>
            <InputNumber style={{ width: "100%" }} placeholder="Chunk Size" />
          </Form.Item>
          <Form.Item
            name="chunkOverlap"
            label="Chunk Overlap"
            rules={[
              { required: true, message: "Please input your chunk overlap!" }
            ]}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Chunk Overlap"
            />
          </Form.Item>

          <div className="flex justify-end">
            <SaveButton disabled={isSaveRAGPending} btnType="submit" />
          </div>
        </Form>
      </div>
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md mb-4 font-semibold dark:text-white">
          Speech Recognition Language
        </h2>
        <Select
          placeholder="Select Language"
          allowClear
          showSearch
          options={SUPPORTED_LANGUAGES}
          value={speechToTextLanguage}
          filterOption={(input, option) =>
            option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
            option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
          onChange={(value) => {
            setSpeechToTextLanguage(value)
          }}
          style={{
            width: "100%"
          }}
        />
      </div>
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md mb-4 font-semibold dark:text-white">Theme</h2>
        {mode === "dark" ? (
          <button
            onClick={toggleDarkMode}
            className="select-none inline-flex w-full rounded-lg border border-gray-900 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:border-gray-100 dark:text-white dark:hover:opacity-75 dark:focus:ring-dark dark:active:opacity-75 dark:disabled:pointer-events-none dark:disabled:opacity-50 dark:disabled:shadow-none">
            <SunIcon className="h-4 w-4 mr-2" />
            Light
          </button>
        ) : (
          <button
            onClick={toggleDarkMode}
            className="select-none inline-flex w-full rounded-lg border border-gray-900 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:border-gray-100 dark:text-white dark:hover:opacity-75 dark:focus:ring-dark dark:active:opacity-75 dark:disabled:pointer-events-none dark:disabled:opacity-50 dark:disabled:shadow-none">
            <MoonIcon className="h-4 w-4 mr-2" />
            Dark
          </button>
        )}
      </div>
    </div>
  )
}
