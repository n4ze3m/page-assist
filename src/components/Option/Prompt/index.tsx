import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Skeleton,
  Table,
  Tooltip,
  notification,
  Modal,
  Input,
  Form,
  Switch,
  Segmented,
  Tag,
  Select,
  Alert
} from "antd"
import { Trash2, Pen, Computer, Zap, Star, CopyIcon, UploadCloud, Download, MessageCircle } from "lucide-react"
import React, { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  deletePromptById,
  getAllPrompts,
  savePrompt,
  updatePrompt,
  exportPrompts,
  importPromptsV2
} from "@/db/dexie/helpers"
import {
  getAllCopilotPrompts,
  setAllCopilotPrompts
} from "@/services/application"
import { tagColors } from "@/utils/color"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { confirmDanger } from "@/components/Common/confirm-danger"
import { useServerOnline } from "@/hooks/useServerOnline"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useMessageOption } from "@/hooks/useMessageOption"

export const PromptBody = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editId, setEditId] = useState("")
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const { t } = useTranslation(["settings", "common", "option"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const [selectedSegment, setSelectedSegment] = useState<"custom" | "copilot">(
    "custom"
  )
  const [searchText, setSearchText] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "system" | "quick">(
    "all"
  )
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")

  const [openCopilotEdit, setOpenCopilotEdit] = useState(false)
  const [editCopilotId, setEditCopilotId] = useState("")
  const [editCopilotForm] = Form.useForm()

  const { setSelectedQuickPrompt } = useMessageOption()

  const { data, status } = useQuery({
    queryKey: ["fetchAllPrompts"],
    queryFn: getAllPrompts
  })

  const { data: copilotData, status: copilotStatus } = useQuery({
    queryKey: ["fetchCopilotPrompts"],
    queryFn: getAllCopilotPrompts
  })

  const promptLoadFailed = status === "error"
  const copilotLoadFailed = copilotStatus === "error"
  const loadErrorDescription = [
    promptLoadFailed
      ? t(
          "managePrompts.loadErrorDetail",
          "Custom prompts couldn’t be retrieved from your tldw server."
        )
      : null,
    copilotLoadFailed
      ? t(
          "managePrompts.copilotLoadErrorDetail",
          "Copilot prompts couldn’t be retrieved."
        )
      : null
  ]
    .filter(Boolean)
    .join(" ")

  const getPromptKeywords = React.useCallback(
    (prompt: any) => prompt?.keywords ?? prompt?.tags ?? [],
    []
  )

  const normalizePromptPayload = React.useCallback((values: any) => {
    const keywords = values?.keywords ?? values?.tags ?? []
    const promptName = values?.name || values?.title
    const resolvedContent =
      values?.content ??
      (values?.is_system ? values?.system_prompt : values?.user_prompt) ??
      values?.system_prompt ??
      values?.user_prompt

    return {
      ...values,
      title: promptName,
      name: promptName,
      tags: keywords,
      keywords,
      content: resolvedContent,
      system_prompt: values?.system_prompt,
      user_prompt: values?.user_prompt,
      author: values?.author,
      details: values?.details,
      is_system: !!values?.is_system
    }
  }, [])

  const { mutate: deletePrompt } = useMutation({
    mutationFn: deletePromptById,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchAllPrompts"]
      })
      notification.success({
        message: t("managePrompts.notification.deletedSuccess"),
        description: t("managePrompts.notification.deletedSuccessDesc")
      })
    },
    onError: (error) => {
      notification.error({
        message: t("managePrompts.notification.error"),
        description: error?.message || t("managePrompts.notification.someError")
      })
    }
  })

  const { mutate: savePromptMutation, isPending: savePromptLoading } =
    useMutation({
      mutationFn: savePrompt,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchAllPrompts"]
        })
        setOpen(false)
        createForm.resetFields()
        notification.success({
          message: t("managePrompts.notification.addSuccess"),
          description: t("managePrompts.notification.addSuccessDesc")
        })
      },
      onError: (error) => {
        notification.error({
          message: t("managePrompts.notification.error"),
          description:
            error?.message || t("managePrompts.notification.someError")
        })
      }
    })

  const { mutate: updatePromptDirect } = useMutation({
    mutationFn: updatePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchAllPrompts"]
      })
    },
    onError: (error) => {
      notification.error({
        message: t("managePrompts.notification.error"),
        description:
          error?.message || t("managePrompts.notification.someError")
      })
    }
  })

  const { mutate: updatePromptMutation, isPending: isUpdatingPrompt } =
    useMutation({
      mutationFn: async (data: any) => {
        return await updatePrompt({
          ...data,
          id: editId
        })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchAllPrompts"]
        })
        setOpenEdit(false)
        editForm.resetFields()
        notification.success({
          message: t("managePrompts.notification.updatedSuccess"),
          description: t("managePrompts.notification.updatedSuccessDesc")
        })
      },
      onError: (error) => {
        notification.error({
          message: t("managePrompts.notification.error"),
          description:
            error?.message || t("managePrompts.notification.someError")
        })
      }
    })

  const { mutate: updateCopilotPrompt, isPending: isUpdatingCopilotPrompt } =
    useMutation({
      mutationFn: async (data: any) => {
        return await setAllCopilotPrompts([
          {
            key: data.key,
            prompt: data.prompt
          }
        ])
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchCopilotPrompts"]
        })
        setOpenCopilotEdit(false)
        editCopilotForm.resetFields()
        notification.success({
          message: t("managePrompts.notification.updatedSuccess"),
          description: t("managePrompts.notification.updatedSuccessDesc")
        })
      },
      onError: (error) => {
        notification.error({
          message: t("managePrompts.notification.error"),
          description:
            error?.message || t("managePrompts.notification.someError")
        })
      }
    })

  const allTags = useMemo(() => {
    const set = new Set<string>()
    ;(data || []).forEach((p: any) =>
      (getPromptKeywords(p) || []).forEach((t: string) => set.add(t))
    )
    return Array.from(set.values())
  }, [data, getPromptKeywords])

  const filteredData = useMemo(() => {
    let items = (data || []) as any[]
    if (typeFilter !== "all") {
      const system = typeFilter === "system"
      items = items.filter((p) => Boolean(p.is_system) === system)
    }
    if (tagFilter.length > 0) {
      items = items.filter((p) =>
        (getPromptKeywords(p) || []).some((t: string) => tagFilter.includes(t))
      )
    }
    if (searchText.trim().length > 0) {
      const q = searchText.toLowerCase()
      items = items.filter(
        (p) => {
          const haystack = [
            p.title,
            p.name,
            p.content,
            p.system_prompt,
            p.user_prompt,
            p.details,
            p.author,
            ...(getPromptKeywords(p) || [])
          ]
          return haystack.some((field: any) =>
            typeof field === "string" ? field.toLowerCase().includes(q) : false
          )
        }
      )
    }
    // favorites first, then newest
    items = items.sort(
      (a, b) =>
        Number(!!b.favorite) - Number(!!a.favorite) ||
        (b.createdAt || 0) - (a.createdAt || 0)
    )
    return items
  }, [data, typeFilter, tagFilter, searchText, getPromptKeywords])

  const triggerExport = async () => {
    try {
      const items = await exportPrompts()
      const blob = new Blob([JSON.stringify(items, null, 2)], {
        type: "application/json"
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `prompts_${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      notification.error({
        message: t("managePrompts.notification.error"),
        description: t("managePrompts.notification.someError")
      })
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const prompts = Array.isArray(json) ? json : json?.prompts || []
      await importPromptsV2(prompts, {
        replaceExisting: importMode === "replace",
        mergeData: importMode === "merge"
      })
      queryClient.invalidateQueries({ queryKey: ["fetchAllPrompts"] })
      notification.success({
        message: t("managePrompts.notification.addSuccess"),
        description: t("managePrompts.notification.addSuccessDesc")
      })
    } catch (e) {
      notification.error({
        message: t("managePrompts.notification.error"),
        description: t("managePrompts.notification.someError")
      })
    }
  }

  function customPrompts() {
    return (
      <div>
        <div className="mb-6 space-y-3">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0 inline-flex gap-2">
              <button
                onClick={() => {
                  if (isFireFoxPrivateMode) {
                    notification.error({
                      message: t(
                        "common:privateModeSaveErrorTitle",
                        "tldw Assistant can't save data"
                      ),
                      description: t(
                        "settings:prompts.privateModeDescription",
                        "Firefox Private Mode does not support saving data to IndexedDB. Please add prompts from a normal window."
                      )
                    })
                    return
                  }
                  setOpen(true)
                }}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("managePrompts.addBtn")}
              </button>
              <button
                onClick={() => triggerExport()}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-2 text-md font-medium leading-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Download className="size-4" /> {t("managePrompts.export", { defaultValue: "Export" })}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-2 text-md font-medium leading-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <UploadCloud className="size-4" /> {t("managePrompts.import", { defaultValue: "Import" })}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportFile(file)
                  e.currentTarget.value = ""
                }}
              />
            </div>
            <div className="ml-4 mt-2 flex-shrink-0 inline-flex gap-2 items-center">
              <Input
                allowClear
                placeholder={t("managePrompts.search", { defaultValue: "Search prompts..." })}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 260 }}
              />
              <Segmented
                value={typeFilter}
                onChange={(v) => setTypeFilter(v as any)}
                options={[
                  { label: t("managePrompts.filter.all", { defaultValue: "All" }), value: "all" },
                  { label: t("managePrompts.filter.system", { defaultValue: "System" }), value: "system" },
                  { label: t("managePrompts.filter.quick", { defaultValue: "Quick" }), value: "quick" }
                ]}
              />
              <Select
                mode="multiple"
                allowClear
                placeholder={t("managePrompts.tags.placeholder", { defaultValue: "Filter keywords" })}
                style={{ minWidth: 200 }}
                value={tagFilter}
                onChange={(v) => setTagFilter(v)}
                options={allTags.map((t) => ({ label: t, value: t }))}
              />
              <Select
                value={importMode}
                onChange={(v) => setImportMode(v as any)}
                options={[
                  { label: t("managePrompts.importMode.merge", { defaultValue: "Merge" }), value: "merge" },
                  { label: t("managePrompts.importMode.replace", { defaultValue: "Replace" }), value: "replace" }
                ]}
                style={{ width: 110 }}
              />
            </div>
          </div>
          <p className="ml-4 text-xs text-gray-500 dark:text-gray-400">
            {t("managePrompts.filterHelp", {
              defaultValue:
                "Search matches name, author, details, and prompt text. Use type and keywords to narrow the list."
            })}
          </p>
        </div>

        {status === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {status === "success" && Array.isArray(data) && data.length === 0 && (
          <FeatureEmptyState
            title={t("settings:managePrompts.emptyTitle", {
              defaultValue: "No custom prompts yet"
            })}
            description={t("settings:managePrompts.emptyDescription", {
              defaultValue:
                "Create reusable prompts for recurring tasks, workflows, and team conventions."
            })}
            examples={[
              t("settings:managePrompts.emptyExample1", {
                defaultValue:
                  "Save your favorite system prompt for summaries, explanations, or translations."
              }),
              t("settings:managePrompts.emptyExample2", {
                defaultValue:
                  "Create quick prompts for common actions like drafting emails or refining notes."
              })
            ]}
            primaryActionLabel={t("settings:managePrompts.emptyPrimaryCta", {
              defaultValue: "Create prompt"
            })}
            onPrimaryAction={() => setOpen(true)}
          />
        )}

        {status === "success" && Array.isArray(data) && data.length > 0 && (
          <Table
            columns={[
              {
                title: "",
                dataIndex: "favorite",
                key: "favorite",
                width: 48,
                render: (_: any, record: any) => (
                  <button
                    onClick={() =>
                      updatePromptDirect({
                        id: record.id,
                        title: record.title,
                        name: record.name,
                        content: record.content,
                        is_system: record.is_system,
                        keywords: getPromptKeywords(record),
                        tags: getPromptKeywords(record),
                        favorite: !record?.favorite
                      })
                    }
                    className="text-yellow-500"
                    title={record?.favorite ? t("managePrompts.unfavorite", { defaultValue: "Unfavorite" }) : t("managePrompts.favorite", { defaultValue: "Favorite" })}
                  >
                    <Star className={`size-4 ${record?.favorite ? '' : 'opacity-30'}`} />
                  </button>
                )
              },
              {
                title: t("managePrompts.columns.title"),
                dataIndex: "title",
                key: "title",
                render: (_: any, record: any) => (
                  <div className="flex max-w-64 flex-col">
                    <span className="line-clamp-1 font-medium">
                      {record?.name || record?.title}
                    </span>
                    {record?.author && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t("managePrompts.form.author.label", {
                          defaultValue: "Author"
                        })}
                        : {record.author}
                      </span>
                    )}
                    {record?.details && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {record.details}
                      </span>
                    )}
                  </div>
                )
              },
              {
                title: t("managePrompts.columns.prompt"),
                key: "content",
                render: (_: any, record: any) => {
                  const systemText =
                    record?.system_prompt ||
                    (record?.is_system ? record?.content : undefined)
                  const userText =
                    record?.user_prompt ||
                    (!record?.is_system ? record?.content : undefined)
                  return (
                    <div className="flex max-w-[26rem] flex-col gap-1">
                      {systemText && (
                        <div className="flex items-start gap-2">
                          <Tag color="volcano">
                            {t("managePrompts.form.systemPrompt.shortLabel", {
                              defaultValue: "System"
                            })}
                          </Tag>
                          <span className="line-clamp-2">{systemText}</span>
                        </div>
                      )}
                      {userText && (
                        <div className="flex items-start gap-2">
                          <Tag color="blue">
                            {t("managePrompts.form.userPrompt.shortLabel", {
                              defaultValue: "User"
                            })}
                          </Tag>
                          <span className="line-clamp-2">{userText}</span>
                        </div>
                      )}
                    </div>
                  )
                }
              },
              {
                title: t("managePrompts.tags.label", { defaultValue: "Keywords" }),
                dataIndex: "keywords",
                key: "keywords",
                render: (_: any, record: any) => {
                  const tags = getPromptKeywords(record)
                  return (
                    <div className="flex max-w-64 flex-wrap gap-1">
                      {(tags || []).map((tag: string) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )
                }
              },
              {
                title: t("managePrompts.columns.type"),
                dataIndex: "is_system",
                key: "is_system",
                render: (is_system) => (
                  <span className="flex items-center gap-2 text-xs w-32">
                    {is_system ? (
                      <>
                        <Computer className="size-4" />{" "}
                        {t("managePrompts.systemPrompt")}
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />{" "}
                        {t("managePrompts.quickPrompt")}
                      </>
                    )}
                  </span>
                )
              },
              {
                title: t("managePrompts.columns.actions"),
                render: (_, record) => (
                  <div className="flex gap-4">
                    <Tooltip
                      title={t("option:promptInsert.useInChatTooltip", {
                        defaultValue:
                          "Open chat and insert this prompt into the composer."
                      })}>
                      <button
                        type="button"
                        aria-label={t("option:promptInsert.useInChat", {
                          defaultValue: "Use in chat"
                        })}
                        onClick={() => {
                          const quickContent =
                            record?.user_prompt ??
                            (!record?.is_system ? record?.content : undefined) ??
                            record?.system_prompt ??
                            record?.content
                          setSelectedQuickPrompt(quickContent)
                          navigate("/")
                        }}
                        disabled={isFireFoxPrivateMode}
                        className="text-gray-500 dark:text-gray-400 disabled:opacity-50">
                        <MessageCircle className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("managePrompts.tooltip.duplicate", { defaultValue: "Duplicate Prompt" })}>
                      <button
                        type="button"
                        aria-label={t("managePrompts.tooltip.duplicate", {
                          defaultValue: "Duplicate Prompt"
                        })}
                        onClick={() => {
                          savePromptMutation({
                            title: `${record.title || record.name} (Copy)`,
                            name: `${record.name || record.title} (Copy)`,
                            content: record.content,
                            is_system: record.is_system,
                            keywords: getPromptKeywords(record),
                            tags: getPromptKeywords(record),
                            favorite: !!record?.favorite,
                            author: record?.author,
                            details: record?.details,
                            system_prompt: record?.system_prompt,
                            user_prompt: record?.user_prompt
                          })
                        }}
                        disabled={isFireFoxPrivateMode}
                        className="text-gray-500 dark:text-gray-400 disabled:opacity-50">
                        <CopyIcon className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("managePrompts.tooltip.delete")}>
                      <button
                        type="button"
                        aria-label={t("managePrompts.tooltip.delete")}
                        onClick={async () => {
                          const ok = await confirmDanger({
                            title: t("common:confirmTitle", { defaultValue: "Please confirm" }),
                            content: t("managePrompts.confirm.delete"),
                            okText: t("common:delete", { defaultValue: "Delete" }),
                            cancelText: t("common:cancel", { defaultValue: "Cancel" })
                          })
                          if (!ok) return
                          deletePrompt(record.id)
                        }}
                        disabled={isFireFoxPrivateMode}
                        className="text-red-500 dark:text-red-400 disabled:opacity-50">
                        <Trash2 className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("managePrompts.tooltip.edit")}>
                      <button
                        type="button"
                        aria-label={t("managePrompts.tooltip.edit")}
                        onClick={() => {
                          setEditId(record.id)
                          editForm.setFieldsValue({
                            name: record?.name || record?.title,
                            author: record?.author,
                            details: record?.details,
                            system_prompt:
                              record?.system_prompt ||
                              (record?.is_system ? record?.content : undefined),
                            user_prompt:
                              record?.user_prompt ||
                              (!record?.is_system ? record?.content : undefined),
                            keywords: getPromptKeywords(record),
                            is_system: !!record?.is_system
                          })
                          setOpenEdit(true)
                        }}
                        disabled={isFireFoxPrivateMode}
                        className="text-gray-500 dark:text-gray-400 disabled:opacity-50">
                        <Pen className="size-4" />
                      </button>
                    </Tooltip>
                  </div>
                )
              }
            ]}
            bordered
            dataSource={filteredData}
            rowKey={(record) => record.id}
          />
        )}
      </div>
    )
  }

  function copilotPrompts() {
    return (
      <div>
        {copilotStatus === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {copilotStatus === "success" && Array.isArray(copilotData) && copilotData.length === 0 && (
          <FeatureEmptyState
            title={t("managePrompts.copilotEmptyTitle", {
              defaultValue: "No Copilot prompts available"
            })}
            description={t("managePrompts.copilotEmptyDescription", {
              defaultValue:
                "Copilot prompts are predefined templates provided by your tldw server."
            })}
            examples={[
              t("managePrompts.copilotEmptyExample1", {
                defaultValue:
                  "Check your server version or configuration if you expect Copilot prompts to be available."
              }),
              t("managePrompts.copilotEmptyExample2", {
                defaultValue:
                  "After updating your server, reload the extension and return to this tab."
              })
            ]}
            primaryActionLabel={t("settings:healthSummary.diagnostics", {
              defaultValue: "Open Diagnostics"
            })}
            onPrimaryAction={() => navigate("/settings/health")}
          />
        )}

        {copilotStatus === "success" && Array.isArray(copilotData) && copilotData.length > 0 && (
          <Table
            columns={[
              {
                title: t("managePrompts.columns.title"),
                dataIndex: "key",
                key: "key",
                render: (content) => (
                  <span className="line-clamp-1">
                    <Tag color={tagColors[content || "default"]}>
                      {t(`common:copilot.${content}`)}
                    </Tag>
                  </span>
                )
              },
              {
                title: t("managePrompts.columns.prompt"),
                dataIndex: "prompt",
                key: "prompt",
                render: (content) => (
                  <span className="line-clamp-1">{content}</span>
                )
              },
              {
                render: (_, record) => (
                  <div className="flex gap-4">
                    <Tooltip title={t("managePrompts.tooltip.edit")}>
                      <button
                        type="button"
                        aria-label={t("managePrompts.tooltip.edit")}
                        onClick={() => {
                          setEditCopilotId(record.key)
                          editCopilotForm.setFieldsValue(record)
                          setOpenCopilotEdit(true)
                        }}
                        className="text-gray-500 dark:text-gray-400">
                        <Pen className="size-4" />
                      </button>
                    </Tooltip>
                  </div>
                )
              }
            ]}
            bordered
            dataSource={copilotData}
            rowKey={(record) => record.key}
          />
        )}
      </div>
    )
  }

  if (!isOnline) {
    return (
      <FeatureEmptyState
        title={t("settings:managePrompts.emptyConnectTitle", {
          defaultValue: "Connect to use Prompts"
        })}
        description={t("settings:managePrompts.emptyConnectDescription", {
          defaultValue:
            "To manage reusable prompts, first connect to your tldw server."
        })}
        examples={[
          t("settings:managePrompts.emptyConnectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("settings:managePrompts.emptyConnectExample2", {
            defaultValue:
              "Once connected, create custom prompts you can reuse across chats."
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
      {(promptLoadFailed || copilotLoadFailed) && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message={t(
            "managePrompts.partialLoad",
            "Some prompt data isn’t available"
          )}
          description={
            loadErrorDescription ||
            t(
              "managePrompts.loadErrorHelp",
              "Check your server connection and refresh to try again."
            )
          }
        />
      )}
      <div className="flex flex-col items-end gap-1 mb-6">
        <Segmented
          size="large"
          options={[
            {
              label: t("managePrompts.segmented.custom", {
                defaultValue: "Custom prompts"
              }),
              value: "custom"
            },
            {
              label: t("managePrompts.segmented.copilot", {
                defaultValue: "Copilot prompts"
              }),
              value: "copilot"
            }
          ]}
          value={selectedSegment}
          onChange={(value) => {
            setSelectedSegment(value as "custom" | "copilot")
          }}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
          {selectedSegment === "custom"
            ? t("managePrompts.segmented.helpCustom", {
                defaultValue:
                  "Create and manage reusable prompts you can insert into chat."
              })
            : t("managePrompts.segmented.helpCopilot", {
                defaultValue:
                  "View and tweak predefined Copilot prompts provided by your server."
              })}
        </p>
      </div>
      {selectedSegment === "custom" && customPrompts()}
      {selectedSegment === "copilot" && copilotPrompts()}

      <Modal
        title={t("managePrompts.modal.addTitle")}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}>
        <Form
          onFinish={(values) => savePromptMutation(normalizePromptPayload(values))}
          layout="vertical"
          form={createForm}
          initialValues={{ is_system: false, keywords: [] }}>
          <Form.Item
            name="name"
            label={t("managePrompts.form.title.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.title.required")
              }
            ]}>
            <Input placeholder={t("managePrompts.form.title.placeholder")} />
          </Form.Item>

          <Form.Item
            name="author"
            label={t("managePrompts.form.author.label", { defaultValue: "Author" })}>
            <Input placeholder={t("managePrompts.form.author.placeholder", { defaultValue: "Optional author" })} />
          </Form.Item>

          <Form.Item
            name="details"
            label={t("managePrompts.form.details.label", { defaultValue: "Details / notes" })}>
            <Input.TextArea
              placeholder={t("managePrompts.form.details.placeholder", { defaultValue: "Add context or usage notes" })}
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="system_prompt"
            label={t("managePrompts.form.systemPrompt.label", { defaultValue: "System prompt" })}
            help={t("managePrompts.form.prompt.help")}
          >
            <Input.TextArea
              placeholder={t("managePrompts.form.systemPrompt.placeholder", { defaultValue: "Optional system prompt sent as the system message" })}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="user_prompt"
            label={t("managePrompts.form.userPrompt.label", { defaultValue: "User prompt" })}
            help={t("managePrompts.form.userPrompt.help", { defaultValue: "Template inserted as the user message when using this prompt." })}>
            <Input.TextArea
              placeholder={t("managePrompts.form.userPrompt.placeholder", { defaultValue: "Optional user prompt template" })}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item name="keywords" label={t("managePrompts.tags.label", { defaultValue: "Keywords" })}>
            <Select
              mode="tags"
              allowClear
              placeholder={t("managePrompts.tags.placeholder", { defaultValue: "Add keywords" })}
              options={allTags.map((t) => ({ label: t, value: t }))}
            />
          </Form.Item>

          <Form.Item
            name="is_system"
            label={t("managePrompts.form.isSystem.label")}
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <button
              disabled={savePromptLoading}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {savePromptLoading
                ? t("managePrompts.form.btnSave.saving")
                : t("managePrompts.form.btnSave.save")}
            </button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("managePrompts.modal.editTitle")}
        open={openEdit}
        onCancel={() => setOpenEdit(false)}
        footer={null}>
        <Form
          onFinish={(values) => updatePromptMutation(normalizePromptPayload(values))}
          layout="vertical"
          form={editForm}
          initialValues={{ is_system: false, keywords: [] }}>
          <Form.Item
            name="name"
            label={t("managePrompts.form.title.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.title.required")
              }
            ]}>
            <Input placeholder={t("managePrompts.form.title.placeholder")} />
          </Form.Item>

          <Form.Item
            name="author"
            label={t("managePrompts.form.author.label", { defaultValue: "Author" })}>
            <Input placeholder={t("managePrompts.form.author.placeholder", { defaultValue: "Optional author" })} />
          </Form.Item>

          <Form.Item
            name="details"
            label={t("managePrompts.form.details.label", { defaultValue: "Details / notes" })}>
            <Input.TextArea
              placeholder={t("managePrompts.form.details.placeholder", { defaultValue: "Add context or usage notes" })}
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="system_prompt"
            label={t("managePrompts.form.systemPrompt.label", { defaultValue: "System prompt" })}
            help={t("managePrompts.form.prompt.help")}
          >
            <Input.TextArea
              placeholder={t("managePrompts.form.systemPrompt.placeholder", { defaultValue: "Optional system prompt sent as the system message" })}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="user_prompt"
            label={t("managePrompts.form.userPrompt.label", { defaultValue: "User prompt" })}
            help={t("managePrompts.form.userPrompt.help", { defaultValue: "Template inserted as the user message when using this prompt." })}>
            <Input.TextArea
              placeholder={t("managePrompts.form.userPrompt.placeholder", { defaultValue: "Optional user prompt template" })}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item name="keywords" label={t("managePrompts.tags.label", { defaultValue: "Keywords" })}>
            <Select
              mode="tags"
              allowClear
              placeholder={t("managePrompts.tags.placeholder", { defaultValue: "Add keywords" })}
              options={allTags.map((t) => ({ label: t, value: t }))}
            />
          </Form.Item>

          <Form.Item
            name="is_system"
            label={t("managePrompts.form.isSystem.label")}
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isUpdatingPrompt}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isUpdatingPrompt
                ? t("managePrompts.form.btnEdit.saving")
                : t("managePrompts.form.btnEdit.save")}
            </button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("managePrompts.modal.editTitle")}
        open={openCopilotEdit}
        onCancel={() => setOpenCopilotEdit(false)}
        footer={null}>
        <Form
          onFinish={(values) =>
            updateCopilotPrompt({
              key: editCopilotId,
              prompt: values.prompt
            })
          }
          layout="vertical"
          form={editCopilotForm}>
          <Form.Item
            name="prompt"
            label={t("managePrompts.form.prompt.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.prompt.required")
              },
              {
                validator: (_, value) => {
                  if (value && value.includes("{text}")) {
                    return Promise.resolve()
                  }
                  return Promise.reject(
                    new Error(
                      t("managePrompts.form.prompt.missingTextPlaceholder")
                    )
                  )
                }
              }
            ]}>
            <Input.TextArea
              placeholder={t("managePrompts.form.prompt.placeholder")}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isUpdatingCopilotPrompt}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isUpdatingCopilotPrompt
                ? t("managePrompts.form.btnEdit.saving")
                : t("managePrompts.form.btnEdit.save")}
            </button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
