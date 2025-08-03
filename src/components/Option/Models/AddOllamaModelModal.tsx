import { useForm } from "@mantine/form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Input, Modal, notification, Button } from "antd"
import { Download, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { getDownloadState } from "~/utils/pull-ollama"
import { browser } from "wxt/browser"
import { CancelPullingModel } from "./CancelPullingModel"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const AddOllamaModelModal: React.FC<Props> = ({ open, setOpen }) => {
  const { t } = useTranslation(["settings", "common", "openai"])
  const queryClient = useQueryClient()
  const [downloadState, setDownloadState] = useState({
    modelName: null,
    isDownloading: false
  })

  const form = useForm({
    initialValues: {
      model: ""
    }
  })

  useEffect(() => {
    const checkDownloadState = async () => {
      const state = await getDownloadState()
      if (
        state &&
        typeof state === "object" &&
        "modelName" in state &&
        "isDownloading" in state
      ) {
        setDownloadState(state)
      } else {
        setDownloadState({ modelName: null, isDownloading: false })
      }
    }

    if (open) {
      checkDownloadState()
      const interval = setInterval(checkDownloadState, 1000)

      return () => clearInterval(interval)
    }
  }, [open])

  const pullModel = async (modelName: string) => {
    modelName.replaceAll("ollama pull", "").replaceAll("ollama run", "").trim()
    notification.info({
      message: t("manageModels.notification.pullModel"),
      description: t("manageModels.notification.pullModelDescription", {
        modelName
      })
    })

    setOpen(false)

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

  const cancelDownloadModel = () => {
    browser.runtime.sendMessage({
      type: "cancel_download"
    })
    notification.info({
      message: t("manageModels.notification.cancellingDownload"),
      description: t("manageModels.notification.cancellingDownloadDescription")
    })
  }

  return (
    <Modal
      footer={null}
      open={open}
      title={t("manageModels.modal.title")}
      onCancel={() => setOpen(false)}>
      {downloadState.isDownloading && (
        <CancelPullingModel
          cancelDownloadModel={cancelDownloadModel}
          modelName={downloadState.modelName}
        />
      )}

      <form onSubmit={form.onSubmit((values) => pullOllamaModel(values.model))}>
        <Input
          {...form.getInputProps("model")}
          required
          placeholder={"qwen2.5:3b"}
          size="large"
          disabled={downloadState.isDownloading}
        />

        <button
          type="submit"
          disabled={downloadState.isDownloading}
          className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
          <Download className="w-5 h-5 mr-3" />
          {downloadState.isDownloading
            ? t("common:downloading")
            : t("manageModels.modal.pull")}
        </button>
      </form>
    </Modal>
  )
}
