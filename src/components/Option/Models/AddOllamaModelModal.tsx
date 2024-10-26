import { useForm } from "@mantine/form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Input, Modal, notification } from "antd"
import { Download } from "lucide-react"
import { useTranslation } from "react-i18next"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const AddOllamaModelModal: React.FC<Props> = ({ open, setOpen }) => {
  const { t } = useTranslation(["settings", "common", "openai"])
  const queryClient = useQueryClient()

  const form = useForm({
    initialValues: {
      model: ""
    }
  })

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
  return (
    <Modal
      footer={null}
      open={open}
      title={t("manageModels.modal.title")}
      onCancel={() => setOpen(false)}>
      <form onSubmit={form.onSubmit((values) => pullOllamaModel(values.model))}>
        <Input
          {...form.getInputProps("model")}
          required
          placeholder={"qwen2.5:3b"}
          size="large"
        />

        <button
          type="submit"
          className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
          <Download className="w-5 h-5 mr-3" />
          {t("manageModels.modal.pull")}
        </button>
      </form>
    </Modal>
  )
}
