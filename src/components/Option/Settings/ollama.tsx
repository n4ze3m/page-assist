import { useMutation, useQuery } from "@tanstack/react-query"
import { Form, InputNumber, Select, Skeleton } from "antd"
import { useState } from "react"
import { SaveButton } from "~components/Common/SaveButton"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  getAllModels,
  getOllamaURL,
  saveForRag,
  setOllamaURL as saveOllamaURL
} from "~services/ollama"

export const SettingsOllama = () => {
  const [ollamaURL, setOllamaURL] = useState<string>("")
  const { data: ollamaInfo, status } = useQuery({
    queryKey: ["fetchOllamURL"],
    queryFn: async () => {
      const [ollamaURL, allModels, chunkOverlap, chunkSize, defaultEM] =
        await Promise.all([
          getOllamaURL(),
          getAllModels(),
          defaultEmbeddingChunkOverlap(),
          defaultEmbeddingChunkSize(),
          defaultEmbeddingModelForRag()
        ])
      setOllamaURL(ollamaURL)
      return {
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

  return (
    <div className="flex flex-col gap-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}
      {status === "success" && (
        <>
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

          <Form
            layout="vertical"
            onFinish={(data) => {
              saveRAG({
                model: data.defaultEM,
                chunkSize: data.chunkSize,
                overlap: data.chunkOverlap
              })
            }}
            initialValues={{
              chunkSize: ollamaInfo?.chunkSize,
              chunkOverlap: ollamaInfo?.chunkOverlap,
              defaultEM: ollamaInfo?.defaultEM
            }}>
            <Form.Item
              name="defaultEM"
              label="Embedding Model"
              help="Highly recommended to use embedding models like `nomic-embed-text`."
              rules={[{ required: true, message: "Please select a model!" }]}>
              <Select
                size="large"
                filterOption={(input, option) =>
                  option.label.toLowerCase().indexOf(input.toLowerCase()) >=
                    0 ||
                  option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                showSearch
                placeholder="Select a model"
                style={{ width: "100%" }}
                className="mt-4"
                options={ollamaInfo.models?.map((model) => ({
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
        </>
      )}
    </div>
  )
}
