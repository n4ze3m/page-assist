import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AddKnowledge } from "./AddKnowledge"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteKnowledge,
  deleteSource,
  getAllKnowledge
} from "@/db/dexie/knowledge"
import { Skeleton, Table, Tag, Tooltip, message, notification } from "antd"
import { FileUpIcon, Trash2, Settings } from "lucide-react"
import { useMessageOption } from "@/hooks/useMessageOption"
import { removeModelSuffix } from "@/db/dexie/models"
import { UpdateKnowledge } from "./UpdateKnowledge"
import { EditKnowledgeSettings } from "./EditKnowledgeSettings"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"

export const KnowledgeSettings = () => {
  const { t } = useTranslation(["knowledge", "common"])
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { selectedKnowledge, setSelectedKnowledge } = useMessageOption()
  const [openUpdate, setOpenUpdate] = useState(false)
  const [updateKnowledgeId, setUpdateKnowledgeId] = useState("")
  const [openEditSettings, setOpenEditSettings] = useState(false)
  const [editSettingsKnowledgeId, setEditSettingsKnowledgeId] = useState("")

  const { data, status } = useQuery({
    queryKey: ["fetchAllKnowledge"],
    queryFn: () => getAllKnowledge(),
    refetchInterval: 1000
  })

  const { mutate: deleteKnowledgeMutation, isPending: isDeleting } =
    useMutation({
      mutationFn: deleteKnowledge,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchAllKnowledge"]
        })

        message.success(t("deleteSuccess"))
      },
      onError: (error) => {
        message.error(error.message)
      }
    })

  const statusColor = {
    finished: "green",
    processing: "yellow",
    pending: "gray",
    failed: "red"
  }

  return (
    <div>
      <div>
        {/* Add new model button */}
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (isFireFoxPrivateMode) {
                    notification.error({
                      message: "Page Assist can't save data",
                      description:
                        "Firefox Private Mode does not support saving data to IndexedDB. Please add knowledge base from a normal window."
                    })
                    return
                  }
                  setOpen(true)
                }}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("addBtn")}
              </button>
            </div>
          </div>
        </div>
        {status === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {status === "success" && (
          <Table
            columns={[
              {
                title: t("columns.title"),
                dataIndex: "title",
                key: "title"
              },
              {
                title: t("columns.status"),
                dataIndex: "status",
                key: "status",
                render: (text: string) => (
                  <Tag color={statusColor[text]}>{t(`status.${text}`)}</Tag>
                )
              },
              {
                title: t("columns.embeddings"),
                dataIndex: "embedding_model",
                key: "embedding_model",
                render: (text) => removeModelSuffix(text)
              },
              {
                title: t("columns.createdAt"),
                dataIndex: "createdAt",
                key: "createdAt",
                render: (text: number) => new Date(text).toLocaleString()
              },
              {
                title: t("columns.action"),
                key: "action",
                render: (text: string, record: any) => (
                  <div className="flex gap-4">
                    <Tooltip title={t("editSettings.tooltip", )}>
                      <button
                        disabled={isDeleting}
                        onClick={() => {
                          setEditSettingsKnowledgeId(record.id)
                          setOpenEditSettings(true)
                        }}
                        className="text-gray-800 dark:text-gray-500 disabled:opacity-50">
                        <Settings className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("updateKnowledge")}>
                      <button
                        disabled={isDeleting || record.status === "processing"}
                        onClick={() => {
                          setUpdateKnowledgeId(record.id)
                          setOpenUpdate(true)
                        }}
                        className="text-gray-700 dark:text-gray-400 disabled:opacity-50">
                        <FileUpIcon className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("common:delete")}>
                      <button
                        disabled={isDeleting}
                        onClick={() => {
                          if (window.confirm(t("confirm.delete"))) {
                            deleteKnowledgeMutation(record.id)
                            if (selectedKnowledge?.id === record?.id) {
                              setSelectedKnowledge(null)
                            }
                          }
                        }}
                        className="text-red-500 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
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
                      title: t("expandedColumns.name"),
                      key: "filename",
                      dataIndex: "filename"
                    },
                    {
                      title: t("columns.action"),
                      key: "action",
                      render: (text: string, r: any) => (
                        <div className="flex gap-4">
                          <Tooltip title={t("common:delete")}>
                            <button
                              disabled={
                                isDeleting || record.status === "processing"
                              }
                              onClick={async () => {
                                if (window.confirm(t("confirm.deleteSource"))) {
                                  await deleteSource(record.id, r.source_id)
                                }
                              }}
                              className="text-red-500 dark:text-red-400 disabled:opacity-50">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </Tooltip>
                        </div>
                      )
                    }
                  ]}
                  dataSource={record.source}
                  locale={{
                    emptyText: t("common:noData")
                  }}
                />
              ),
              defaultExpandAllRows: false
            }}
            bordered
            dataSource={data}
            rowKey={(record) => `${record.name}-${record.id}`}
          />
        )}
      </div>

      <AddKnowledge open={open} setOpen={setOpen} />
      <UpdateKnowledge
        id={updateKnowledgeId}
        open={openUpdate}
        setOpen={setOpenUpdate}
      />
      <EditKnowledgeSettings
        id={editSettingsKnowledgeId}
        open={openEditSettings}
        setOpen={setOpenEditSettings}
      />
    </div>
  )
}
