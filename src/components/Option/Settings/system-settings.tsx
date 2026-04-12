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
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Checkbox, Modal, Select, notification, Switch } from "antd"
import { useState } from "react"
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

  const handleImportFileSelected = async (file: File) => {
    try {
      const parsed = await parseImportFile(file)
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
