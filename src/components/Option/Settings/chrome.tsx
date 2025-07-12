import { useStorage } from "@plasmohq/storage/hook"
import { useQuery } from "@tanstack/react-query"
import { Alert, Skeleton, Switch, Modal, Progress, message } from "antd"
import { useTranslation } from "react-i18next"
import { getChromeAISupported } from "@/utils/chrome"
import Markdown from "@/components/Common/Markdown"
import { downloadChromeAIModel } from "@/utils/chrome-download"
import { useState } from "react"

export const ChromeApp = () => {
  const { t } = useTranslation("chrome")
  const [chromeAIStatus, setChromeAIStatus] = useStorage(
    "chromeAIStatus",
    false
  )
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const { status, data, refetch } = useQuery({
    queryKey: ["fetchChromeAIInfo"],
    queryFn: async () => {
      const data = await getChromeAISupported()
      return data
    }
  })

  const handleDownloadModel = async () => {
    try {
      setIsDownloading(true)
      setDownloadProgress(0)
      setShowWarningModal(false)

      await downloadChromeAIModel((progress) => {
        console.log("Download progress:", progress) 
        const percentage = Math.round(progress.loaded * 100)
        setDownloadProgress(percentage)
      })

      message.success(t("downloadSuccess"))
      setIsDownloading(false)
      setDownloadProgress(0)

      // Refetch to update the UI
      refetch()
    } catch (error) {
      console.error("Download failed:", error)
      message.error(t("downloadError"))
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }
  return (
    <div className="flex flex-col space-y-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}
      {status === "success" && (
        <div className="flex flex-col space-y-6">
          <div>
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("heading")}
              </h2>
              <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
            </div>

            {["downloadable", "downloading"].includes(data) ? (
              <div className="flex mb-3 flex-row justify-between">
                <div className="inline-flex items-center gap-2">
                  <span className="text-gray-700 text-sm dark:text-neutral-50">
                    {t("downloadModel.label", {
                      defaultValue: "Download Gemini Nano Model (approx. 4GB)"
                    })}
                  </span>
                </div>
                <button
                  onClick={() => setShowWarningModal(true)}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-md font-medium transition-colors duration-200 
                    dark:bg-white dark:text-black bg-black text-white hover:opacity-90 disabled:opacity-50">
                  {isDownloading ? `${downloadProgress}%` : t("downloadModel")}
                </button>
              </div>
            ) : null}

            <div className="flex mb-3 flex-row justify-between">
              <div className="inline-flex items-center gap-2">
                <span className="text-gray-700 text-sm dark:text-neutral-50">
                  {t("status.label")}
                </span>
              </div>

              <Switch
                disabled={data !== "success"}
                checked={chromeAIStatus}
                onChange={(value) => {
                  setChromeAIStatus(value)
                  if (
                    !value &&
                    selectedModel === "chrome::gemini-nano::page-assist"
                  ) {
                    setSelectedModel(null)
                  }
                }}
              />
            </div>
            {data !== "success" && (
              <div className="space-y-3">
                {!["downloadable", "downloading"].includes(data) ? (
                  <>
                    <Alert message={t(`error.${data}`)} type="error" showIcon />
                    <div className="w-full">
                      <Markdown
                        className="text-sm text-gray-700 dark:text-neutral-50 leading-7 text-justify"
                        message={t("errorDescription")}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning Modal */}
      <Modal
        title={t("downloadModal.title")}
        open={showWarningModal}
        onOk={handleDownloadModel}
        onCancel={() => setShowWarningModal(false)}
        okText={t("downloadModal.confirm")}
        cancelText={t("downloadModal.cancel")}
        okButtonProps={{ loading: isDownloading }}
        cancelButtonProps={{ disabled: isDownloading }}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("modelDownloadWarning")}
          </p>
        </div>
      </Modal>

      {/* Download Progress Modal */}
      <Modal
        title={t("downloadModal.downloading")}
        open={isDownloading}
        footer={null}
        closable={false}
        maskClosable={false}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("downloadModal.downloadingDescription")}
          </p>
          <Progress
            percent={downloadProgress}
            status={downloadProgress === 100 ? "success" : "active"}
            strokeColor={{
              "0%": "#108ee9",
              "100%": "#87d068"
            }}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t("downloadModal.pleaseWait")}
          </p>
        </div>
      </Modal>
    </div>
  )
}
