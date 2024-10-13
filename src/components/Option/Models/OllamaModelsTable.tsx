import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton, Table, Tag, Tooltip, notification, Modal, Input } from "antd"
import { bytePerSecondFormatter } from "~/libs/byte-formater"
import { deleteModel, getAllModels } from "~/services/ollama"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useForm } from "@mantine/form"
import {  RotateCcw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"

dayjs.extend(relativeTime)

export const OllamaModelsTable = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation(["settings", "common"])
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")

  const form = useForm({
    initialValues: {
      model: ""
    }
  })

  const { data, status } = useQuery({
    queryKey: ["fetchAllModels"],
    queryFn: () => getAllModels({ returnEmpty: true })
  })

  const { mutate: deleteOllamaModel } = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchAllModels"]
      })
      notification.success({
        message: t("manageModels.notification.success"),
        description: t("manageModels.notification.successDeleteDescription")
      })
    },
    onError: (error) => {
      notification.error({
        message: "Error",
        description: error?.message || t("manageModels.notification.someError")
      })
    }
  })

  const pullModel = async (modelName: string) => {
    notification.info({
      message: t("manageModels.notification.pullModel"),
      description: t("manageModels.notification.pullModelDescription", {
        modelName
      })
    })

    form.reset()

    browser.runtime.sendMessage({
      type: "pull_model",
      modelName
    })

    return true
  }

  const { mutate: pullOllamaModel } = useMutation({
    mutationFn: pullModel
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
                  title: t("manageModels.columns.name"),
                  dataIndex: "name",
                  key: "name"
                },
                {
                  title: t("manageModels.columns.digest"),
                  dataIndex: "digest",
                  key: "digest",
                  render: (text: string) => (
                    <Tooltip title={text}>
                      <Tag
                        className="cursor-pointer"
                        color="blue">{`${text?.slice(0, 5)}...${text?.slice(-4)}`}</Tag>
                    </Tooltip>
                  )
                },
                {
                  title: t("manageModels.columns.modifiedAt"),
                  dataIndex: "modified_at",
                  key: "modified_at",
                  render: (text: string) => dayjs(text).fromNow(true)
                },
                {
                  title: t("manageModels.columns.size"),
                  dataIndex: "size",
                  key: "size",
                  render: (text: number) => bytePerSecondFormatter(text)
                },
                {
                  title: t("manageModels.columns.actions"),
                  render: (_, record) => (
                    <div className="flex gap-4">
                      <Tooltip title={t("manageModels.tooltip.delete")}>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(t("manageModels.confirm.delete"))
                            ) {
                              deleteOllamaModel(record.model)
                              if (
                                selectedModel &&
                                selectedModel === record.model
                              ) {
                                setSelectedModel(null)
                              }
                            }
                          }}
                          className="text-red-500 dark:text-red-400">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </Tooltip>
                      <Tooltip title={t("manageModels.tooltip.repull")}>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(t("manageModels.confirm.repull"))
                            ) {
                              pullOllamaModel(record.model)
                            }
                          }}
                          className="text-gray-700 dark:text-gray-400">
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      </Tooltip>
                    </div>
                  )
                }
              ]}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    pagination={false}
                    columns={[
                      {
                        title: t("manageModels.expandedColumns.parentModel"),
                        key: "parent_model",
                        dataIndex: "parent_model"
                      },
                      {
                        title: t("manageModels.expandedColumns.format"),
                        key: "format",
                        dataIndex: "format"
                      },
                      {
                        title: t("manageModels.expandedColumns.family"),
                        key: "family",
                        dataIndex: "family"
                      },
                      {
                        title: t("manageModels.expandedColumns.parameterSize"),
                        key: "parameter_size",
                        dataIndex: "parameter_size"
                      },
                      {
                        title: t(
                          "manageModels.expandedColumns.quantizationLevel"
                        ),
                        key: "quantization_level",
                        dataIndex: "quantization_level"
                      }
                    ]}
                    dataSource={[record.details]}
                    locale={{
                      emptyText: t("common:noData")
                    }}
                  />
                ),
                defaultExpandAllRows: false
              }}
              bordered
              dataSource={data}
              rowKey={(record) => `${record.model}-${record.digest}`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
