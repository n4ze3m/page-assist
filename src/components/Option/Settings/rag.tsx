import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Form, InputNumber, Select, Skeleton } from "antd"
import { SaveButton } from "~/components/Common/SaveButton"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  getEmbeddingModels,
  saveForRag
} from "~/services/ollama"
import { SettingPrompt } from "./prompt"
import { useTranslation } from "react-i18next"
import { getNoOfRetrievedDocs, getTotalFilePerKB } from "@/services/app"
import { SidepanelRag } from "./sidepanel-rag"
import { ProviderIcons } from "@/components/Common/ProviderIcon"

export const RagSettings = () => {
  const { t } = useTranslation("settings")

  const queryClient = useQueryClient()

  const { data: ollamaInfo, status } = useQuery({
    queryKey: ["fetchRAGSettings"],
    queryFn: async () => {
      const [
        allModels,
        chunkOverlap,
        chunkSize,
        defaultEM,
        totalFilePerKB,
        noOfRetrievedDocs
      ] = await Promise.all([
        getEmbeddingModels({ returnEmpty: true }),
        defaultEmbeddingChunkOverlap(),
        defaultEmbeddingChunkSize(),
        defaultEmbeddingModelForRag(),
        getTotalFilePerKB(),
        getNoOfRetrievedDocs()
      ])
      return {
        models: allModels,
        chunkOverlap,
        chunkSize,
        defaultEM,
        totalFilePerKB,
        noOfRetrievedDocs
      }
    }
  })

  const { mutate: saveRAG, isPending: isSaveRAGPending } = useMutation({
    mutationFn: async (data: {
      model: string
      chunkSize: number
      overlap: number
      totalFilePerKB: number
      noOfRetrievedDocs: number
    }) => {
      await saveForRag(
        data.model,
        data.chunkSize,
        data.overlap,
        data.totalFilePerKB,
        data.noOfRetrievedDocs
      )
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchRAGSettings"]
      })
    }
  })

  return (
    <div className="flex flex-col space-y-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}
      {status === "success" && (
        <div className="flex flex-col space-y-6">
          <div>
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("rag.ragSettings.label")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>
            <Form
              layout="vertical"
              onFinish={(data) => {
                saveRAG({
                  model: data.defaultEM,
                  chunkSize: data.chunkSize,
                  overlap: data.chunkOverlap,
                  totalFilePerKB: data.totalFilePerKB,
                  noOfRetrievedDocs: data.noOfRetrievedDocs
                })
              }}
              initialValues={{
                chunkSize: ollamaInfo?.chunkSize,
                chunkOverlap: ollamaInfo?.chunkOverlap,
                defaultEM: ollamaInfo?.defaultEM,
                totalFilePerKB: ollamaInfo?.totalFilePerKB,
                noOfRetrievedDocs: ollamaInfo?.noOfRetrievedDocs
              }}>
              <Form.Item
                name="defaultEM"
                label={t("rag.ragSettings.model.label")}
                help={t("rag.ragSettings.model.help")}
                rules={[
                  {
                    required: true,
                    message: t("rag.ragSettings.model.required")
                  }
                ]}>
                <Select
                  size="large"
                  showSearch
                  placeholder={t("rag.ragSettings.model.placeholder")}
                  style={{ width: "100%" }}
                  className="mt-4"
                  filterOption={(input, option) =>
                    option.label.key
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                  options={ollamaInfo.models?.map((model) => ({
                    label: (
                      <span
                        key={model.model}
                        className="flex flex-row gap-3 items-center truncate">
                        <ProviderIcons
                          provider={model?.provider}
                          className="w-5 h-5"
                        />
                        <span className="truncate">{model.name}</span>
                      </span>
                    ),
                    value: model.model
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="chunkSize"
                label={t("rag.ragSettings.chunkSize.label")}
                rules={[
                  {
                    required: true,
                    message: t("rag.ragSettings.chunkSize.required")
                  }
                ]}>
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder={t("rag.ragSettings.chunkSize.placeholder")}
                />
              </Form.Item>
              <Form.Item
                name="chunkOverlap"
                label={t("rag.ragSettings.chunkOverlap.label")}
                rules={[
                  {
                    required: true,
                    message: t("rag.ragSettings.chunkOverlap.required")
                  }
                ]}>
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder={t("rag.ragSettings.chunkOverlap.placeholder")}
                />
              </Form.Item>

              <Form.Item
                name="noOfRetrievedDocs"
                label={t("rag.ragSettings.noOfRetrievedDocs.label")}
                rules={[
                  {
                    required: true,
                    message: t("rag.ragSettings.noOfRetrievedDocs.required")
                  }
                ]}>
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder={t(
                    "rag.ragSettings.noOfRetrievedDocs.placeholder"
                  )}
                />
              </Form.Item>

              <Form.Item
                name="totalFilePerKB"
                label={t("rag.ragSettings.totalFilePerKB.label")}
                rules={[
                  {
                    required: true,
                    message: t("rag.ragSettings.totalFilePerKB.required")
                  }
                ]}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  placeholder={t("rag.ragSettings.totalFilePerKB.placeholder")}
                />
              </Form.Item>

              <div className="flex justify-end">
                <SaveButton disabled={isSaveRAGPending} btnType="submit" />
              </div>
            </Form>
          </div>

          <SidepanelRag />

          <div>
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("rag.prompt.label")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>
            <SettingPrompt />
          </div>
        </div>
      )}
    </div>
  )
}
