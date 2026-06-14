import { BetaTag } from "@/components/Common/Beta"
import { SaveButton } from "@/components/Common/SaveButton"
import { useFontSize } from "@/context/FontSizeProvider"
import { useMessageOption } from "@/hooks/useMessageOption"
import {
  ALL_EXPORT_SECTIONS,
  exportPageAssistData,
  ExportSection,
  getAvailableImportSections,
  importPageAssistDataFromObject,
  parseImportFile
} from "@/libs/export-import"
import {
  convertOpenWebUIToPageAssist,
  isOpenWebUIExport
} from "@/libs/openwebui-import"
import {
  analyzeMapping,
  convertWithMapping,
  distinctRoleValues,
  inferMapping,
  sampleConversationFor,
  sampleMessageFor,
  suggestArrayPaths,
  suggestFields,
  type DynamicMapping
} from "@/libs/dynamic-import"
import { fetchChatModels } from "@/services/ollama"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AutoComplete, Checkbox, Modal, Select, notification, Switch } from "antd"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, RotateCcw, Upload } from "lucide-react"
import { toBase64 } from "@/libs/to-base64"
import { PageAssistDatabase } from "@/db/dexie/chat"
import { isFireFox, isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { firefoxSyncDataForPrivateMode } from "@/db/dexie/firefox-sync"

export const SystemSettings = () => {
  const { t } = useTranslation(["settings", "knowledge"])
  const queryClient = useQueryClient()
  const { clearChat } = useMessageOption()
  const { increase, decrease, scale } = useFontSize()

  const [webuiBtnSidePanel, setWebuiBtnSidePanel] = useStorage(
    "webuiBtnSidePanel",
    false
  )

  const [storageSyncEnabled, setStorageSyncEnabled] = useStorage(
    {
      key: "storageSyncEnabled",
      instance: new Storage({
        area: "local"
      })
    },
    true
  )

  const [actionIconClick, setActionIconClick] = useStorage(
    {
      key: "actionIconClick",
      instance: new Storage({
        area: "local"
      })
    },
    "webui"
  )

  const [contextMenuClick, setContextMenuClick] = useStorage(
    {
      key: "contextMenuClick",
      instance: new Storage({
        area: "local"
      })
    },
    "sidePanel"
  )
  const [chatBackgroundImage, setChatBackgroundImage] = useStorage({
    key: "chatBackgroundImage",
    instance: new Storage({
      area: "local"
    })
  })

  const SECTION_LABELS: Record<ExportSection, string> = {
    knowledge: "Knowledge Base",
    chat: "Chat History",
    vector: "Vector Embeddings",
    prompts: "Prompts",
    oaiConfigs: "OpenAI Configurations",
    nicknames: "Model Nicknames",
    models: "Custom Models",
    mcpServers: "MCP Servers",
    storageLocal: "Local Settings",
    storageSync: "Synced Settings"
  }

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportSelected, setExportSelected] =
    useState<ExportSection[]>(ALL_EXPORT_SECTIONS)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importParsedData, setImportParsedData] = useState<any>(null)
  const [importAvailable, setImportAvailable] = useState<
    Partial<Record<ExportSection, number>>
  >({})
  const [importSelected, setImportSelected] = useState<ExportSection[]>([])

  const [dynamicModalOpen, setDynamicModalOpen] = useState(false)
  const [dynamicRawData, setDynamicRawData] = useState<any>(null)
  const [dynamicMapping, setDynamicMapping] = useState<DynamicMapping>({
    conversationsPath: "",
    messageMode: "nested",
    messagesPath: "",
    roleField: "",
    contentField: ""
  })
  const [dynamicDefaultModel, setDynamicDefaultModel] = useState<
    string | undefined
  >(undefined)

  const dynamicPreview = useMemo(() => {
    if (!dynamicRawData) return null
    try {
      return analyzeMapping(dynamicRawData, dynamicMapping)
    } catch (e) {
      console.error("Dynamic mapping preview error:", e)
      return null
    }
  }, [dynamicRawData, dynamicMapping])

  const dynamicRawJson = useMemo(() => {
    if (!dynamicRawData) return ""
    try {
      const str = JSON.stringify(dynamicRawData, null, 2)
      return str.length > 50000 ? str.slice(0, 50000) + "\n…(truncated)" : str
    } catch {
      return ""
    }
  }, [dynamicRawData])

  const conversationPathOptions = useMemo(
    () =>
      dynamicRawData
        ? suggestArrayPaths(dynamicRawData).map((p) => ({
            value: p,
            label: p === "" ? "(root)" : p
          }))
        : [],
    [dynamicRawData]
  )

  const messagePathOptions = useMemo(() => {
    if (!dynamicRawData) return []
    if (dynamicMapping.messageMode === "joined") {
      return suggestArrayPaths(dynamicRawData).map((p) => ({
        value: p,
        label: p === "" ? "(root)" : p
      }))
    }
    const conv = sampleConversationFor(dynamicRawData, dynamicMapping)
    const paths = suggestArrayPaths(conv)
    if (conv && typeof conv === "object" && "mapping" in conv) {
      paths.push("mapping")
    }
    if (conv?.history && typeof conv.history === "object") {
      paths.push("history.messages")
    }
    return Array.from(new Set(paths)).map((p) => ({
      value: p,
      label: p === "" ? "(conversation itself)" : p
    }))
  }, [
    dynamicRawData,
    dynamicMapping.messageMode,
    dynamicMapping.conversationsPath
  ])

  const messageFieldOptions = useMemo(() => {
    if (!dynamicRawData) return []
    const msg = sampleMessageFor(dynamicRawData, dynamicMapping)
    return suggestFields(msg).map((f) => ({ value: f, label: f }))
  }, [
    dynamicRawData,
    dynamicMapping.messageMode,
    dynamicMapping.conversationsPath,
    dynamicMapping.messagesPath
  ])

  const conversationFieldOptions = useMemo(() => {
    if (!dynamicRawData) return []
    const conv = sampleConversationFor(dynamicRawData, dynamicMapping)
    return suggestFields(conv).map((f) => ({ value: f, label: f }))
  }, [dynamicRawData, dynamicMapping.conversationsPath])

  const roleValueOptions = useMemo(() => {
    if (!dynamicRawData) return []
    return distinctRoleValues(dynamicRawData, dynamicMapping).map((v) => ({
      value: v,
      label: v
    }))
  }, [
    dynamicRawData,
    dynamicMapping.conversationsPath,
    dynamicMapping.messagesPath,
    dynamicMapping.roleField
  ])

  const updateMapping = (patch: Partial<DynamicMapping>) =>
    setDynamicMapping((prev) => ({ ...prev, ...patch }))

  const { data: chatModels, isLoading: isChatModelsLoading } = useQuery({
    queryKey: ["fetchChatModelsForImport"],
    queryFn: () => fetchChatModels({ returnEmpty: true }),
    enabled: dynamicModalOpen
  })

  const exportDataMutation = useMutation({
    mutationFn: async (sections: ExportSection[]) => {
      await exportPageAssistData(sections)
    },
    onSuccess: () => {
      setExportModalOpen(false)
      notification.success({
        message: "Exported data successfully"
      })
    },
    onError: (error) => {
      console.error("Export error:", error)
      notification.error({
        message: "Export error"
      })
    }
  })

  const importDataMutation = useMutation({
    mutationFn: async ({
      data,
      sections
    }: {
      data: any
      sections: ExportSection[]
    }) => {
      await importPageAssistDataFromObject(data, sections)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })

      setImportModalOpen(false)
      setImportParsedData(null)

      notification.success({
        message: "Imported data successfully"
      })

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
    onError: (error) => {
      console.error("Import error:", error)
      notification.error({
        message: "Import error"
      })
    }
  })

  const dynamicImportMutation = useMutation({
    mutationFn: async ({
      data,
      mapping,
      defaultModelId
    }: {
      data: any
      mapping: DynamicMapping
      defaultModelId?: string
    }) => {
      const converted = convertWithMapping(data, mapping, { defaultModelId })
      await importPageAssistDataFromObject(converted, ["chat"])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })

      setDynamicModalOpen(false)
      setDynamicRawData(null)
      setDynamicDefaultModel(undefined)

      notification.success({
        message: "Imported data successfully"
      })

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
    onError: (error) => {
      console.error("Dynamic import error:", error)
      notification.error({
        message: "Import error"
      })
    }
  })

  const handleDynamicImportFileSelected = async (file: File) => {
    try {
      const raw = await parseImportFile(file)
      setDynamicRawData(raw)
      setDynamicMapping(inferMapping(raw))
      setDynamicDefaultModel(undefined)
      setDynamicModalOpen(true)
    } catch (e) {
      console.error("Parse dynamic import file error:", e)
      notification.error({
        message: "Invalid file"
      })
    }
  }

  const handleImportFileSelected = async (file: File) => {
    try {
      const raw = await parseImportFile(file)
      const parsed = isOpenWebUIExport(raw)
        ? convertOpenWebUIToPageAssist(raw)
        : raw
      const available = getAvailableImportSections(parsed)
      const availableKeys = Object.keys(available) as ExportSection[]

      if (availableKeys.length === 0) {
        notification.error({
          message: "No importable data found in this file"
        })
        return
      }

      setImportParsedData(parsed)
      setImportAvailable(available)
      setImportSelected(availableKeys)
      setImportModalOpen(true)
    } catch (e) {
      console.error("Parse import file error:", e)
      notification.error({
        message: "Invalid file"
      })
    }
  }

  const syncFirefoxData = useMutation({
    mutationFn: firefoxSyncDataForPrivateMode,
    onSuccess: () => {
      notification.success({
        message:
          "Firefox data synced successfully, You don't need to do this again"
      })
    },
    onError: (error) => {
      console.log(error)
      notification.error({
        message: "Firefox data sync failed"
      })
    }
  })

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        if (!file.type.startsWith("image/")) {
          notification.error({
            message: "Please select a valid image file"
          })
          return
        }

        const base64String = await toBase64(file)
        setChatBackgroundImage(base64String)
      } catch (error) {
        console.error("Error uploading image:", error)
        notification.error({
          message: "Failed to upload image"
        })
      }
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("generalSettings.system.heading")}
        </h2>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
      </div>
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-black dark:text-white font-medium">
          <BetaTag />
          {t("generalSettings.system.fontSize.label")}
        </span>
        <div className="flex flex-row items-center gap-3 justify-center sm:justify-end">
          <button
            onClick={decrease}
            className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium text-sm">
            A-
          </button>
          <span className="min-w-[2rem] text-center font-medium text-black dark:text-white">
            {scale.toFixed(1)}x
          </span>
          <button
            onClick={increase}
            className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium text-sm">
            A+
          </button>{" "}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          <BetaTag />
          {t("generalSettings.system.actionIcon.label")}
        </span>
        <Select
          options={[
            {
              label: "Open Web UI",
              value: "webui"
            },
            {
              label: "Open SidePanel",
              value: "sidePanel"
            }
          ]}
          value={actionIconClick}
          className="w-full sm:w-[200px]"
          onChange={(value) => {
            setActionIconClick(value)
          }}
        />
      </div>
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          <BetaTag />
          {t("generalSettings.system.contextMenu.label")}
        </span>
        <Select
          options={[
            {
              label: "Open Web UI",
              value: "webui"
            },
            {
              label: "Open SidePanel",
              value: "sidePanel"
            }
          ]}
          value={contextMenuClick}
          className="w-full sm:w-[200px]"
          onChange={(value) => {
            setContextMenuClick(value)
          }}
        />
      </div>
      {isFireFox && !isFireFoxPrivateMode && (
        <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
          <span className="text-gray-700 dark:text-neutral-50">
            <BetaTag />
            {t("generalSettings.system.firefoxPrivateModeSync.label", {
              defaultValue:
                "Sync Custom Models, Prompts for Firefox Private Windows (Incognito Mode)"
            })}
          </span>
          <button
            onClick={() => {
              syncFirefoxData.mutate()
            }}
            disabled={syncFirefoxData.isPending}
            className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer w-full sm:w-auto">
            {syncFirefoxData.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("generalSettings.system.firefoxPrivateModeSync.button", {
                defaultValue: "Sync Data"
              })
            )}
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.storageSyncEnabled.label")}
        </span>
        <div>
          <Switch
            checked={storageSyncEnabled}
            onChange={(checked) => {
              setStorageSyncEnabled(checked)
            }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.webuiBtnSidePanel.label")}
        </span>
         <div>
          <Switch
          checked={webuiBtnSidePanel}
          onChange={(checked) => {
            setWebuiBtnSidePanel(checked)
          }}
        />
         </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          <BetaTag />
          {t("generalSettings.system.chatBackgroundImage.label")}
        </span>
        <div className="flex items-center gap-2 justify-center sm:justify-end">
          {chatBackgroundImage ? (
            <button
              onClick={() => {
                setChatBackgroundImage(null)
              }}
              className="text-gray-800 dark:text-white">
              <RotateCcw className="size-4" />
            </button>
          ) : null}
          <label
            htmlFor="background-image-upload"
            className="bg-gray-800 inline-flex gap-2 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer">
            <Upload className="size-4" />
            {t("knowledge:form.uploadFile.label")}
          </label>
          <input
            type="file"
            accept="image/*"
            id="background-image-upload"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.export.label")}
        </span>
        <button
          onClick={() => {
            setExportSelected(ALL_EXPORT_SECTIONS)
            setExportModalOpen(true)
          }}
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer w-full sm:w-auto">
          {t("generalSettings.system.export.button")}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.import.label")}
        </span>
        <label
          htmlFor="import"
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer flex items-center justify-center w-full sm:w-auto">
          {importDataMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            t("generalSettings.system.import.button")
          )}
        </label>
        <input
          type="file"
          accept=".json"
          id="import"
          className="hidden"
          disabled={importDataMutation.isPending}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleImportFileSelected(e.target.files[0])
              e.target.value = ""
            }
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          <BetaTag />
          {t("generalSettings.system.dynamicImport.label", {
            defaultValue: "Import from another service"
          })}
        </span>
        <label
          htmlFor="dynamic-import"
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer flex items-center justify-center w-full sm:w-auto">
          {dynamicImportMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            t("generalSettings.system.dynamicImport.button", {
              defaultValue: "Import"
            })
          )}
        </label>
        <input
          type="file"
          accept=".json"
          id="dynamic-import"
          className="hidden"
          disabled={dynamicImportMutation.isPending}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleDynamicImportFileSelected(e.target.files[0])
              e.target.value = ""
            }
          }}
        />
      </div>

      <Modal
        title="Export Page Assist Data"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={
          <SaveButton
            text="Export"
            textOnSave="Exported"
            disabled={
              exportSelected.length === 0 || exportDataMutation.isPending
            }
            onClick={() => exportDataMutation.mutate(exportSelected)}
            className="!mt-0 w-full justify-center"
          />
        }>
        <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
          Select which data to include in the export file.
        </p>
        <Checkbox.Group
          value={exportSelected}
          onChange={(values) => setExportSelected(values as ExportSection[])}
          className="flex flex-col w-full border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
          {ALL_EXPORT_SECTIONS.map((section, idx) => (
            <label
              key={section}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                idx < ALL_EXPORT_SECTIONS.length - 1
                  ? "border-b border-gray-300 dark:border-gray-600"
                  : ""
              }`}>
              <Checkbox value={section}>
                <span className="text-gray-800 dark:text-neutral-100">
                  {SECTION_LABELS[section]}
                </span>
              </Checkbox>
            </label>
          ))}
        </Checkbox.Group>
        {exportSelected.includes("knowledge") &&
          !exportSelected.includes("vector") && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              Knowledge entries depend on vector embeddings. Exporting without
              vectors may leave imports unusable for retrieval.
            </p>
          )}
      </Modal>

      <Modal
        title="Import Page Assist Data"
        open={importModalOpen}
        onCancel={() => {
          if (importDataMutation.isPending) return
          setImportModalOpen(false)
          setImportParsedData(null)
        }}
        footer={
          <SaveButton
            text="Import"
            textOnSave="Imported"
            disabled={
              importSelected.length === 0 ||
              !importParsedData ||
              importDataMutation.isPending
            }
            onClick={() =>
              importDataMutation.mutate({
                data: importParsedData,
                sections: importSelected
              })
            }
            className="!mt-0 w-full justify-center"
          />
        }>
        <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
          The file contains the following data. Select which sections to
          import.
        </p>
        <Checkbox.Group
          value={importSelected}
          onChange={(values) => setImportSelected(values as ExportSection[])}
          className="flex flex-col w-full border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
          {(() => {
            const keys = Object.keys(importAvailable) as ExportSection[]
            return keys.map((section, idx) => (
              <label
                key={section}
                className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  idx < keys.length - 1
                    ? "border-b border-gray-300 dark:border-gray-600"
                    : ""
                }`}>
                <Checkbox value={section}>
                  <span className="text-gray-800 dark:text-neutral-100">
                    {SECTION_LABELS[section]}
                  </span>
                </Checkbox>
                <span className="text-xs text-gray-500 dark:text-neutral-400 tabular-nums">
                  {importAvailable[section]}
                </span>
              </label>
            ))
          })()}
        </Checkbox.Group>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
          Importing will merge with or overwrite existing data in the selected
          sections.
        </p>
      </Modal>

      <Modal
        title="Import from another service"
        open={dynamicModalOpen}
        width={900}
        onCancel={() => {
          if (dynamicImportMutation.isPending) return
          setDynamicModalOpen(false)
          setDynamicRawData(null)
          setDynamicDefaultModel(undefined)
        }}
        footer={
          <SaveButton
            text="Import"
            textOnSave="Imported"
            disabled={
              !dynamicPreview ||
              dynamicPreview.conversationCount === 0 ||
              (!dynamicPreview.hasModel && !dynamicDefaultModel) ||
              dynamicImportMutation.isPending
            }
            onClick={() =>
              dynamicImportMutation.mutate({
                data: dynamicRawData,
                mapping: dynamicMapping,
                defaultModelId: dynamicDefaultModel
              })
            }
            className="!mt-0 w-full justify-center"
          />
        }>
        <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
          Map the fields in your file (left) to what Page Assist expects
          (right). We pre-filled our best guess — adjust anything that looks
          wrong.
        </p>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left: raw imported data */}
          <div className="md:w-1/2 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-1">
              Imported file
            </span>
            <pre className="flex-1 max-h-[420px] overflow-auto text-xs bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-gray-600 rounded-md p-3 text-gray-800 dark:text-neutral-200 whitespace-pre">
              {dynamicRawJson}
            </pre>
          </div>

          {/* Right: mapping form */}
          <div className="md:w-1/2 flex flex-col gap-3 max-h-[420px] overflow-auto pr-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400">
              Field mapping
            </span>

            <div>
              <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                Conversations path
              </label>
              <AutoComplete
                allowClear
                className="w-full"
                placeholder="(root)"
                options={conversationPathOptions}
                value={dynamicMapping.conversationsPath}
                onChange={(value) =>
                  updateMapping({ conversationsPath: value || "" })
                }
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                Messages layout
              </label>
              <Select
                className="w-full"
                value={dynamicMapping.messageMode}
                onChange={(value) =>
                  updateMapping({
                    messageMode: value as "nested" | "joined",
                    messagesPath: ""
                  })
                }
                options={[
                  {
                    label: "Inside each conversation",
                    value: "nested"
                  },
                  {
                    label: "Separate list, joined by ID",
                    value: "joined"
                  }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                {dynamicMapping.messageMode === "joined"
                  ? "Messages path (from root)"
                  : "Messages path (within a conversation)"}
              </label>
              <AutoComplete
                allowClear
                className="w-full"
                placeholder={
                  dynamicMapping.messageMode === "joined"
                    ? "messages"
                    : "(conversation itself)"
                }
                options={messagePathOptions}
                value={dynamicMapping.messagesPath}
                onChange={(value) =>
                  updateMapping({ messagesPath: value || "" })
                }
              />
            </div>

            {dynamicMapping.messageMode === "joined" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                    Conversation ID field
                  </label>
                  <AutoComplete
                    allowClear
                    className="w-full"
                    placeholder="id"
                    options={conversationFieldOptions}
                    value={dynamicMapping.conversationIdField}
                    onChange={(value) =>
                      updateMapping({ conversationIdField: value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                    Message's conversation ID
                  </label>
                  <AutoComplete
                    allowClear
                    className="w-full"
                    placeholder="threadId"
                    options={messageFieldOptions}
                    value={dynamicMapping.messageThreadField}
                    onChange={(value) =>
                      updateMapping({ messageThreadField: value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  Role field
                </label>
                <AutoComplete
                  allowClear
                  className="w-full"
                  placeholder="role"
                  options={messageFieldOptions}
                  value={dynamicMapping.roleField}
                  onChange={(value) =>
                    updateMapping({ roleField: value || "" })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  Content field
                </label>
                <AutoComplete
                  allowClear
                  className="w-full"
                  placeholder="content"
                  options={messageFieldOptions}
                  value={dynamicMapping.contentField}
                  onChange={(value) =>
                    updateMapping({ contentField: value || "" })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  "User" role value
                </label>
                <AutoComplete
                  allowClear
                  className="w-full"
                  placeholder="auto"
                  options={roleValueOptions}
                  value={dynamicMapping.userValue}
                  onChange={(value) => updateMapping({ userValue: value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  "Assistant" role value
                </label>
                <AutoComplete
                  allowClear
                  className="w-full"
                  placeholder="auto"
                  options={roleValueOptions}
                  value={dynamicMapping.assistantValue}
                  onChange={(value) => updateMapping({ assistantValue: value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  Title field (optional)
                </label>
                <AutoComplete
                  allowClear
                  className="w-full"
                  placeholder="auto"
                  options={conversationFieldOptions}
                  value={dynamicMapping.titleField}
                  onChange={(value) => updateMapping({ titleField: value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  Timestamp field (optional)
                </label>
                <AutoComplete
                  allowClear
                  className="w-full"
                  placeholder="auto"
                  options={messageFieldOptions}
                  value={dynamicMapping.timeField}
                  onChange={(value) => updateMapping({ timeField: value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                Model field (optional)
              </label>
              <AutoComplete
                allowClear
                className="w-full"
                placeholder="auto"
                options={messageFieldOptions}
                value={dynamicMapping.modelField}
                onChange={(value) => updateMapping({ modelField: value })}
              />
            </div>

            {/* Live preview */}
            <div className="flex items-center gap-4 px-3 py-2 rounded-md bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-gray-600">
              <span className="text-xs text-gray-600 dark:text-neutral-300">
                Detected{" "}
                <span className="font-semibold tabular-nums">
                  {dynamicPreview?.conversationCount ?? 0}
                </span>{" "}
                conversations,{" "}
                <span className="font-semibold tabular-nums">
                  {dynamicPreview?.messageCount ?? 0}
                </span>{" "}
                messages
              </span>
            </div>

            {dynamicPreview && !dynamicPreview.hasModel && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-300 mb-1">
                  Default model
                </label>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mb-1">
                  No model found in the file. Pick one from your list to use for
                  the imported chats.
                </p>
                <Select
                  showSearch
                  optionFilterProp="label"
                  loading={isChatModelsLoading}
                  placeholder="Select a model"
                  className="w-full"
                  value={dynamicDefaultModel}
                  onChange={(value) => setDynamicDefaultModel(value)}
                  options={chatModels?.map((model) => ({
                    label: model?.nickname || model.name || model.model,
                    value: model.model
                  }))}
                />
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
          Imported conversations will be added to your existing chat history.
        </p>
      </Modal>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.deleteChatHistory.label")}
        </span>

        <button
          onClick={async () => {
            const confirm = window.confirm(
              t("generalSettings.system.deleteChatHistory.confirm")
            )

            if (confirm) {
              const db = new PageAssistDatabase()
              await db.clearDB()
              queryClient.invalidateQueries({
                queryKey: ["fetchChatHistory"]
              })
              clearChat()
              try {
                if (storageSyncEnabled) {
                  await browser.storage.sync.clear()
                }
                await browser.storage.local.clear()
                await browser.storage.session.clear()
              } catch (e) {
                console.error("Error clearing storage:", e)
              }
            }
          }}
          className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-200 px-4 py-2 rounded-md w-full sm:w-auto">
          {t("generalSettings.system.deleteChatHistory.button")}
        </button>
      </div>
    </div>
  )
}
