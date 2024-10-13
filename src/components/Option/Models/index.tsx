import { Segmented } from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { OllamaModelsTable } from "./OllamaModelsTable"
import { CustomModelsTable } from "./CustomModelsTable"
import { AddOllamaModelModal } from "./AddOllamaModelModal"
import { AddCustomModelModal } from "./AddCustomModelModal"

dayjs.extend(relativeTime)

export const ModelsBody = () => {
  const [open, setOpen] = useState(false)
  const [openAddModelModal, setOpenAddModelModal] = useState(false)
  const [segmented, setSegmented] = useState<string>("ollama")

  const { t } = useTranslation(["settings", "common", "openai"])

  return (
    <div>
      <div>
        {/* Add new model button */}
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (segmented === "ollama") {
                    setOpen(true)
                  } else {
                    setOpenAddModelModal(true)
                  }
                }}
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

      <AddOllamaModelModal open={open} setOpen={setOpen} />

      <AddCustomModelModal
        open={openAddModelModal}
        setOpen={setOpenAddModelModal}
      />
    </div>
  )
}
