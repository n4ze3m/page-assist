import { useMutation, } from "@tanstack/react-query"
import {
  notification,
  Modal,
  Input,
  Segmented
} from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useState } from "react"
import { useForm } from "@mantine/form"
import { Download } from "lucide-react"
import { useTranslation } from "react-i18next"
import { OllamaModelsTable } from "./OllamaModelsTable"
import { CustomModelsTable } from "./CustomModelsTable"

dayjs.extend(relativeTime)

export const ModelsBody = () => {
  const [open, setOpen] = useState(false)
  const [segmented, setSegmented] = useState<string>("ollama")

  const { t } = useTranslation(["settings", "common", "openai"])

  const form = useForm({
    initialValues: {
      model: ""
    }
  })

  const pullModel = async (modelName: string) => {
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
    <div>
      <div>
        {/* Add new model button */}
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("manageModels.addBtn")}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end mt-3">
            <Segmented
              options={[
                {
                  label: t("common:segmented.ollama"),
                  value: "ollama"
                },
                {
                  label: t("common:segmented.custom"),
                  value: "custom"
                }
              ]}
              onChange={(value) => {
                setSegmented(value)
              }}
            />
          </div>
        </div>

        {segmented === "ollama" ? <OllamaModelsTable /> : <CustomModelsTable />}
      </div>

      <Modal
        footer={null}
        open={open}
        title={t("manageModels.modal.title")}
        onCancel={() => setOpen(false)}>
        <form
          onSubmit={form.onSubmit((values) => pullOllamaModel(values.model))}>
          <Input
            {...form.getInputProps("model")}
            required
            placeholder={t("manageModels.modal.placeholder")}
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
    </div>
  )
}
