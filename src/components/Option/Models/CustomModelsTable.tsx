import { getAllCustomModels, deleteModel } from "@/db/models"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { Skeleton, Table, Tag, Tooltip } from "antd"
import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

export const CustomModelsTable = () => {
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")

  const { t } = useTranslation(["openai", "common"])

  const queryClient = useQueryClient()

  const { data, status } = useQuery({
    queryKey: ["fetchCustomModels"],
    queryFn: () => getAllCustomModels()
  })

  const { mutate: deleteCustomModel } = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchCustomModels"]
      })
    }
  })

  return (
    <div>
      <div>
        {status === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {status === "success" && (
          <div className="overflow-x-auto">
            <Table
              columns={[
                {
                  title: t("manageModels.columns.model_id"),
                  dataIndex: "model_id",
                  key: "model_id"
                },
                {
                  title: t("manageModels.columns.model_type"),
                  dataIndex: "model_type",
                  render: (txt) => (
                    <Tag color={txt === "chat" ? "green" : "blue"}>
                      {t(`radio.${txt}`)}
                    </Tag>
                  )
                },
                {
                  title: t("manageModels.columns.provider"),
                  dataIndex: "provider",
                  render: (_, record) => record.provider.name
                },
                {
                  title: t("manageModels.columns.actions"),
                  render: (_, record) => (
                    <Tooltip title={t("manageModels.tooltip.delete")}>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(t("manageModels.confirm.delete"))
                          ) {
                            deleteCustomModel(record.id)
                            if (selectedModel && selectedModel === record.id) {
                              setSelectedModel(null)
                            }
                          }
                        }}
                        className="text-red-500 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </Tooltip>
                  )
                }
              ]}
              bordered
              dataSource={data}
            />
          </div>
        )}
      </div>
    </div>
  )
}
