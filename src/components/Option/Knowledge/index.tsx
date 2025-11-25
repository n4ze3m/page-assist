import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteKnowledge,
  deleteSource,
  getAllKnowledge
} from "@/db/dexie/knowledge"
import {
  Skeleton,
  Table,
  Tag,
  Tooltip,
  notification,
  Input,
  Button,
  List,
  Switch,
  Spin,
  Select
} from "antd"
import { FileUpIcon, Trash2 } from "lucide-react"
import { useMessageOption } from "@/hooks/useMessageOption"
import { removeModelSuffix } from "@/db/dexie/models"
import { useNavigate } from "react-router-dom"
import { AddKnowledge } from "./AddKnowledge"
import { UpdateKnowledge } from "./UpdateKnowledge"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { useConfirmDanger } from "@/components/Common/confirm-danger"
import { useServerOnline } from "@/hooks/useServerOnline"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useDemoMode } from "@/context/demo-mode"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { getNoOfRetrievedDocs } from "@/services/app"
import { RagDocsPerReplyHint } from "./RagDocsPerReplyHint"
import { useAntdMessage } from "@/hooks/useAntdMessage"

export const KnowledgeSettings = () => {
  const { t } = useTranslation(["knowledge", "common"])
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const {
    selectedKnowledge,
    setSelectedKnowledge,
    chatMode,
    setChatMode
  } = useMessageOption()
  const [openUpdate, setOpenUpdate] = useState(false)
  const [updateKnowledgeId, setUpdateKnowledgeId] = useState("")
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const [ragQuery, setRagQuery] = useState("")
  const [ragLoading, setRagLoading] = useState(false)
  const [ragResults, setRagResults] = useState<any[]>([])
  const [ragError, setRagError] = useState<string | null>(null)
  const message = useAntdMessage()
  const confirmDanger = useConfirmDanger()

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

  const ragUnsupported =
    !capsLoading && capabilities && !capabilities.hasRag

  const autoRagOn = chatMode === "rag"
  const isRagSearchBlocked = !selectedKnowledge

  const handleRagSearch = async () => {
    const q = ragQuery.trim()
    if (!q) return
    if (!selectedKnowledge) {
      message.warning(
        t("knowledge:rag.searchMissingKnowledge", {
          defaultValue: "Select a knowledge base first."
        })
      )
      return
    }
    setRagLoading(true)
    setRagError(null)
    setRagResults([])
    try {
      await tldwClient.initialize()
      const top_k = await getNoOfRetrievedDocs()
      const ragRes = await tldwClient.ragSearch(q, {
        knowledge_id: selectedKnowledge.id,
        top_k
      })
      const docs =
        ragRes?.results || ragRes?.documents || ragRes?.docs || []
      setRagResults(Array.isArray(docs) ? docs : [])
    } catch (e: any) {
      setRagResults([])
      setRagError(
        e?.message ||
          t("knowledge:rag.searchFailed", {
            defaultValue:
              "RAG search failed. Try again or check Diagnostics."
          })
      )
    } finally {
      setRagLoading(false)
    }
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

  const finishedKnowledge =
    status === "success" && Array.isArray(data)
      ? data.filter((k: any) => k.status === "finished")
      : []
  const hasFinishedKnowledge = finishedKnowledge.length > 0

  return (
    <div className="space-y-8">
      {/* RAG search & chat workspace */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#171717]">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t("knowledge:ragWorkspace.title", {
              defaultValue: "RAG search & knowledge chat"
            })}
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {t("knowledge:ragWorkspace.description", {
              defaultValue:
                "Choose a knowledge base, configure retrieval, then open Chat to ask questions with RAG on every reply."
            })}
          </p>
        </div>
        {ragUnsupported ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
            <div className="font-semibold">
              {t("knowledge:ragWorkspace.ragUnsupportedTitle", {
                defaultValue: "RAG search is not available on this server"
              })}
            </div>
            <p className="mt-1">
              {t("knowledge:ragWorkspace.ragUnsupportedDescription", {
                defaultValue:
                  "This tldw server does not advertise the RAG endpoints. Open Diagnostics to inspect available APIs or upgrade your server."
              })}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="small"
                onClick={() => navigate("/settings/health")}
              >
                {t("settings:healthSummary.diagnostics", {
                  defaultValue: "Open Diagnostics"
                })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
            {/* Left: knowledge selection + chat integration */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t("knowledge:ragWorkspace.selectionLabel", {
                      defaultValue: "Selected knowledge base"
                    })}
                  </span>
                  {status === "pending" && (
                    <span className="text-[10px] text-gray-400">
                      {t("knowledge:ragWorkspace.loadingKnowledge", {
                        defaultValue: "Loading knowledge…"
                      })}
                    </span>
                  )}
                </div>
                <Select
                  size="small"
                  placeholder={t(
                    "knowledge:ragWorkspace.selectionPlaceholder",
                    {
                      defaultValue: hasFinishedKnowledge
                        ? "Choose a knowledge base"
                        : "Add a knowledge base below to get started"
                    }
                  )}
                  className="w-full"
                  loading={status === "pending"}
                  disabled={!hasFinishedKnowledge}
                  value={selectedKnowledge?.id || undefined}
                  onChange={(id) => {
                    const kb = finishedKnowledge.find((k: any) => k.id === id)
                    setSelectedKnowledge(kb || null)
                  }}
                  options={finishedKnowledge.map((k: any) => ({
                    label: k.title,
                    value: k.id
                  }))}
                  allowClear
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {selectedKnowledge
                    ? t("knowledge:ragWorkspace.selectionActive", {
                        defaultValue:
                          "This knowledge base will be used for RAG searches in Chat.",
                        title: selectedKnowledge.title
                      })
                    : t("knowledge:ragWorkspace.selectionInactive", {
                        defaultValue:
                          "Select a finished knowledge base to enable RAG grounding in Chat."
                      })}
                </p>
                {!hasFinishedKnowledge && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t("knowledge:ragWorkspace.noFinishedKnowledge", {
                        defaultValue:
                          "You don’t have any finished knowledge bases yet. Add knowledge in the table below, then select it here for RAG."
                      })}
                    </p>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => setOpen(true)}
                    >
                      {t("knowledge:ragWorkspace.addKnowledgeCta", {
                        defaultValue: "Add knowledge"
                      })}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-md bg-gray-50 p-2 text-xs dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {t("knowledge:ragWorkspace.autoRagLabel", {
                      defaultValue: "Use RAG for every reply"
                    })}
                  </span>
                  <Switch
                    size="small"
                    checked={autoRagOn}
                    onChange={(checked) => setChatMode(checked ? "rag" : "normal")}
                  />
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                  {t("knowledge:ragWorkspace.autoRagHelp", {
                    defaultValue:
                      "When enabled, the Chat workspace will run a RAG search against the selected knowledge before answering each message."
                  })}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t("knowledge:ragWorkspace.autoRagScopeHelp", {
                    defaultValue:
                      "This setting applies to replies in the main Chat view and sidepanel."
                  })}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t("knowledge:ragWorkspace.docsPerReply.label", {
                      defaultValue: "Documents per reply (top-k)"
                    })}
                  </span>
                  <RagDocsPerReplyHint />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    type="primary"
                    disabled={!selectedKnowledge}
                    onClick={() => {
                      if (!selectedKnowledge) {
                        message.warning(
                          t("knowledge:rag.searchMissingKnowledge", {
                            defaultValue: "Select a knowledge base first."
                          })
                        )
                        return
                      }
                      if (!autoRagOn) {
                        setChatMode("rag")
                      }
                      navigate("/")
                      setTimeout(() => {
                        try {
                          window.dispatchEvent(
                            new CustomEvent("tldw:focus-composer")
                          )
                        } catch {
                          // ignore
                        }
                      }, 0)
                    }}
                  >
                    {t("knowledge:ragWorkspace.openChatCta", {
                      defaultValue: "Open chat with this knowledge"
                    })}
                  </Button>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => navigate("/settings/rag")}
                  >
                    {t("knowledge:ragWorkspace.openRagSettings", {
                      defaultValue: "RAG settings"
                    })}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: RAG search panel */}
            <div className="space-y-2 rounded-md border border-gray-200 p-3 text-xs dark:border-gray-700 dark:bg-[#1f1f1f]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {t("knowledge:ragWorkspace.searchTitle", {
                    defaultValue: "Quick RAG search"
                  })}
                </span>
                {selectedKnowledge && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {selectedKnowledge.title}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Input
                  size="small"
                  className="flex-1 min-w-[10rem]"
                  placeholder={t(
                    "knowledge:ragWorkspace.searchPlaceholder",
                    {
                      defaultValue: "Search across this knowledge base"
                    }
                  )}
                  disabled={isRagSearchBlocked}
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  onPressEnter={() => {
                    if (isRagSearchBlocked) return
                    handleRagSearch()
                  }}
                />
                <Button
                  size="small"
                  onClick={handleRagSearch}
                  disabled={ragLoading || isRagSearchBlocked}
                >
                  {t("knowledge:ragWorkspace.searchButton", {
                    defaultValue: "Search"
                  })}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {isRagSearchBlocked
                  ? t("knowledge:ragWorkspace.searchInactiveHelp", {
                      defaultValue:
                        "Select a finished knowledge base above before running a search."
                    })
                  : t("knowledge:ragWorkspace.searchActiveHelp", {
                      defaultValue:
                        "Search runs against the selected knowledge only. Use Chat for multi-source RAG."
                    })}
              </p>
              <div className="mt-2 min-h-[4rem]">
                {ragLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Spin size="small" />
                  </div>
                ) : ragError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100">
                    <div className="font-medium">
                      {t("knowledge:ragWorkspace.searchErrorTitle", {
                        defaultValue: "RAG search failed"
                      })}
                    </div>
                    <p className="mt-1">{ragError}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="small"
                        type="default"
                        onClick={() => navigate("/settings/health")}
                      >
                        {t("settings:healthSummary.diagnostics", {
                          defaultValue: "Open Diagnostics"
                        })}
                      </Button>
                    </div>
                  </div>
                ) : ragResults.length === 0 ? (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t("knowledge:ragWorkspace.noResults", {
                      defaultValue:
                        "No RAG results yet. Enter a query to search this knowledge base."
                    })}
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={ragResults}
                    renderItem={(item: any) => {
                      const content =
                        item?.content || item?.text || item?.chunk || ""
                      const meta = item?.metadata || {}
                      const title =
                        meta?.title ||
                        meta?.source ||
                        meta?.url ||
                        t("knowledge:ragWorkspace.untitled", {
                          defaultValue: "Untitled snippet"
                        })
                      const url = meta?.url || meta?.source || ""
                      const snippet = String(content || "").slice(0, 260)
                      const insertText = `${snippet}${
                        url ? `\n\nSource: ${url}` : ""
                      }`
                      return (
                        <List.Item
                          actions={[
                            <Button
                              key="copy"
                              type="link"
                              size="small"
                              onClick={() =>
                                navigator.clipboard.writeText(insertText)
                              }
                            >
                              {t("knowledge:ragWorkspace.copySnippet", {
                                defaultValue: "Copy snippet"
                              })}
                            </Button>,
                            url ? (
                              <Button
                                key="open"
                                type="link"
                                size="small"
                                onClick={() =>
                                  window.open(String(url), "_blank")
                                }
                              >
                                {t("knowledge:ragWorkspace.openSource", {
                                  defaultValue: "Open source"
                                })}
                              </Button>
                            ) : null
                          ].filter(Boolean as any)}
                        >
                          <List.Item.Meta
                            title={
                              <span className="text-xs font-medium">
                                {title}
                              </span>
                            }
                            description={
                              <div className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-3">
                                {snippet}
                              </div>
                            }
                          />
                        </List.Item>
                      )
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge management table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t("knowledge:table.sectionTitle", {
              defaultValue: "Knowledge sources"
            })}
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {t("knowledge:table.sectionDescription", {
              defaultValue:
                "Upload and organize your documents into knowledge bases. Finished items can then be used for RAG searches and chat."
            })}
          </p>
        </div>
        {/* Add new knowledge base button */}
        <div className="mb-2">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isFireFoxPrivateMode) {
                    notification.error({
                      message: t(
                        "common:privateModeSaveErrorTitle",
                        "tldw Assistant can't save data"
                      ),
                      description: t(
                        "knowledge:privateModeDescription",
                        "Firefox Private Mode does not support saving data to IndexedDB. Please add knowledge base from a normal window."
                      )
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
                render: (text: string) => {
                  const label = t(`status.${text}`)
                  const isBusy = text === "processing" || text === "pending"
                  return (
                    <span className="inline-flex items-center gap-2">
                      {isBusy && <Spin size="small" />}
                      <Tag className="m-0" color={statusColor[text]}>
                        {label}
                      </Tag>
                    </span>
                  )
                }
              },
              {
                title: t("columns.embeddings"),
                dataIndex: "embedding_model",
                key: "embedding_model",
                render: (text) => removeModelSuffix(text)
              },
              {
                title: t("knowledge:table.sourcesColumn", {
                  defaultValue: "Sources"
                }),
                key: "sourcesCount",
                render: (_: string, record: any) => {
                  const count = Array.isArray(record.source)
                    ? record.source.length
                    : 0
                  return (
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {t("knowledge:table.sourcesCount", {
                        defaultValue: "{{count}} files",
                        count
                      })}
                    </span>
                  )
                }
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
                        type="button"
                        aria-label={t("updateKnowledge") as string}
                        disabled={isDeleting || record.status === "processing"}
                        onClick={() => {
                          setUpdateKnowledgeId(record.id)
                          setOpenUpdate(true)
                        }}
                        className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-400 disabled:opacity-50"
                      >
                        <FileUpIcon className="w-5 h-5" />
                        <span className="hidden text-xs font-medium sm:inline">
                          {t("newSource", {
                            defaultValue: "Add files"
                          })}
                        </span>
                      </button>
                    </Tooltip>
                    <Tooltip title={t("common:delete")}>
                      <button
                        type="button"
                        aria-label={t("common:delete") as string}
                        disabled={isDeleting}
                        onClick={async () => {
                          const ok = await confirmDanger({
                            title: t("common:confirmTitle", {
                              defaultValue: "Please confirm"
                            }),
                            content:
                              t("confirm.delete", {
                                defaultValue:
                                  "Are you sure you want to delete this knowledge?"
                              }) +
                              (record?.title ? ` (${record.title})` : ""),
                            okText: t("common:delete", {
                              defaultValue: "Delete"
                            }),
                            cancelText: t("common:cancel", {
                              defaultValue: "Cancel"
                            })
                          })
                          if (!ok) return
                          deleteKnowledgeMutation(record.id)
                          if (selectedKnowledge?.id === record?.id) {
                            setSelectedKnowledge(null)
                          }
                        }}
                        className="inline-flex items-center gap-1 text-red-500 dark:text-red-400"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="hidden text-xs font-medium sm:inline">
                          {t("common:delete", { defaultValue: "Delete" })}
                        </span>
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
                              type="button"
                              aria-label={t("common:delete") as string}
                              disabled={
                                isDeleting || record.status === "processing"
                              }
                              onClick={async () => {
                                const ok = await confirmDanger({
                                  title: t("common:confirmTitle", {
                                    defaultValue: "Please confirm"
                                  }),
                                  content:
                                    t("confirm.deleteSource", {
                                      defaultValue:
                                        "Are you sure you want to delete this source?"
                                    }) +
                                    (r?.filename ? ` (${r.filename})` : ""),
                                  okText: t("common:delete", {
                                    defaultValue: "Delete"
                                  }),
                                  cancelText: t("common:cancel", {
                                    defaultValue: "Cancel"
                                  })
                                })
                                if (!ok) return
                                await deleteSource(record.id, r.source_id)
                              }}
                              className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 disabled:opacity-50"
                            >
                              <Trash2 className="w-5 h-5" />
                              <span className="hidden text-xs font-medium sm:inline">
                                {t("common:delete", {
                                  defaultValue: "Delete"
                                })}
                              </span>
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
              defaultExpandAllRows: false,
              expandRowByClick: true
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
