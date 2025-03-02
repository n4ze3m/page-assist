import { getAllCustomModels, deleteModel } from "@/db/models"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { Avatar, Skeleton, Table, Tag, Tooltip } from "antd"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ModelNickModelNicknameModal } from "./ModelNicknameModal"

export const CustomModelsTable = () => {
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const [openNicknameModal, setOpenNicknameModal] = useState(false)
  const [model, setModel] = useState<{
    model_id: string
    model_name?: string
    model_avatar?: string
  }>({
    model_id: "",
    model_name: "",
    model_avatar: ""
  })
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
                  title: t("manageModels.columns.nickname"),
                  dataIndex: "nickname",
                  key: "nickname",
                  render: (text: string, record: any) => (
                    <div className="flex items-center gap-2">
                      {record.avatar && (
                        <Avatar
                          size="small"
                          src={record.avatar}
                          alt={record.nickname}
                        />
                      )}
                      <span>{text}</span>
                      <button
                        onClick={() => {
                          setModel({
                            model_id: record.id,
                            model_name: record.nickname,
                            model_avatar: record.avatar
                          })
                          setOpenNicknameModal(true)
                        }}>
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  )
                },
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
      <ModelNickModelNicknameModal
        model_id={model.model_id}
        open={openNicknameModal}
        setOpen={setOpenNicknameModal}
        model_name={model.model_name}
        model_avatar={model.model_avatar}
      />
    </div>
  )
}
