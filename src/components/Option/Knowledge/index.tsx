import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteKnowledge,
  deleteSource,
  getAllKnowledge
} from "@/db/dexie/knowledge"
import { Skeleton, Table, Tag, Tooltip, message, notification } from "antd"
import { FileUpIcon, Trash2 } from "lucide-react"
import { useMessageOption } from "@/hooks/useMessageOption"
import { removeModelSuffix } from "@/db/dexie/models"
import { useNavigate } from "react-router-dom"
import { AddKnowledge } from "./AddKnowledge"
import { UpdateKnowledge } from "./UpdateKnowledge"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { confirmDanger } from "@/components/Common/confirm-danger"
import { useServerOnline } from "@/hooks/useServerOnline"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useDemoMode } from "@/context/demo-mode"

export const KnowledgeSettings = () => {
  const { t } = useTranslation(["knowledge", "common"])
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { selectedKnowledge, setSelectedKnowledge } = useMessageOption()
  const [openUpdate, setOpenUpdate] = useState(false)
  const [updateKnowledgeId, setUpdateKnowledgeId] = useState("")
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()

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

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={t("knowledge:empty.demoTitle", {
          defaultValue: "Explore Knowledge in demo mode"
        })}
        description={t("knowledge:empty.demoDescription", {
          defaultValue:
            "This demo shows how Knowledge can organize your sources for better search. Connect your own server later to index your real documents and transcripts."
        })}
        examples={[
          t("knowledge:empty.demoExample1", {
            defaultValue:
              "See how knowledge bases and sources appear in this table."
          }),
          t("knowledge:empty.demoExample2", {
            defaultValue:
              "When you connect, you’ll be able to upload files and text that tldw can search across."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    ) : (
      <FeatureEmptyState
        title={t("knowledge:empty.connectTitle", {
          defaultValue: "Connect to use Knowledge"
        })}
        description={t("knowledge:empty.connectDescription", {
          defaultValue:
            "To use Knowledge, first connect to your tldw server so new sources can be indexed."
        })}
        examples={[
          t("knowledge:empty.connectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("knowledge:empty.connectExample2", {
            defaultValue:
              "Use Diagnostics if your server is running but not reachable."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
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
                      message: "tldw Assistant can't save data",
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

        {status === "success" && Array.isArray(data) && data.length === 0 && (
          <FeatureEmptyState
            title={t("knowledge:empty.title", {
              defaultValue: "No knowledge sources yet"
            })}
            description={t("knowledge:empty.description", {
              defaultValue:
                "Add knowledge bases so tldw can ground answers in your own documents, transcripts, and files."
            })}
            examples={[
              t("knowledge:empty.example1", {
                defaultValue:
                  "Upload PDFs, transcripts, or notes that you frequently reference in chat."
              }),
              t("knowledge:empty.example2", {
                defaultValue:
                  "Organize related documents into a single knowledge base to reuse across chats."
              })
            ]}
            primaryActionLabel={t("knowledge:empty.primaryCta", {
              defaultValue: "Add knowledge"
            })}
            onPrimaryAction={() => setOpen(true)}
          />
        )}

        {status === "success" && Array.isArray(data) && data.length > 0 && (
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
                        onClick={async () => {
                          const ok = await confirmDanger({
                            title: t("common:confirmTitle", { defaultValue: "Please confirm" }),
                            content: t("confirm.delete"),
                            okText: t("common:delete", { defaultValue: "Delete" }),
                            cancelText: t("common:cancel", { defaultValue: "Cancel" })
                          })
                          if (!ok) return
                          deleteKnowledgeMutation(record.id)
                          if (selectedKnowledge?.id === record?.id) {
                            setSelectedKnowledge(null)
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
                                const ok = await confirmDanger({
                                  title: t("common:confirmTitle", { defaultValue: "Please confirm" }),
                                  content: t("confirm.deleteSource"),
                                  okText: t("common:delete", { defaultValue: "Delete" }),
                                  cancelText: t("common:cancel", { defaultValue: "Cancel" })
                                })
                                if (!ok) return
                                await deleteSource(record.id, r.source_id)
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
    </div>
  )
}
