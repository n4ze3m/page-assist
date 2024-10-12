import { getOpenAIConfigById } from "@/db/openai"
import { getAllOpenAIModels } from "@/libs/openai"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Checkbox, Input, Spin, message } from "antd"
import { useState, useMemo } from "react"
import { createManyModels } from "@/db/models"

type Props = {
  openaiId: string
  setOpenModelModal: (openModelModal: boolean) => void
}

export const OpenAIFetchModel = ({ openaiId, setOpenModelModal }: Props) => {
  const { t } = useTranslation(["openai"])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const { data, status } = useQuery({
    queryKey: ["openAIConfigs", openaiId],
    queryFn: async () => {
      const config = await getOpenAIConfigById(openaiId)
      const models = await getAllOpenAIModels(config.baseUrl, config.apiKey)
      return models
    },
    enabled: !!openaiId
  })

  const filteredModels = useMemo(() => {
    return (
      data?.filter((model) =>
        (model.name ?? model.id)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) || []
    )
  }, [data, searchTerm])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedModels(filteredModels.map((model) => model.id))
    } else {
      setSelectedModels([])
    }
  }

  const handleModelSelect = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModels((prev) => [...prev, modelId])
    } else {
      setSelectedModels((prev) => prev.filter((id) => id !== modelId))
    }
  }

  const onSave = async (models: string[]) => {
    const payload = models.map((id) => ({
      model_id: id,
      name: filteredModels.find((model) => model.id === id)?.name ?? id,
      provider_id: openaiId
    }))

    await createManyModels(payload)

    return true
  }

  const { mutate: saveModels, isPending: isSaving } = useMutation({
    mutationFn: onSave,
    onSuccess: () => {
      setOpenModelModal(false)
      message.success(t("modal.model.success"))
    }
  })

  const handleSave = () => {
    saveModels(selectedModels)
  }

  if (status === "pending") {
    return <Spin />
  }
  if (status === "error" || !data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-md text-center text-gray-600 dark:text-gray-300">
          {t("noModelFound")}
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("modal.model.subheading")}
      </p>
      <Input
        placeholder={t("searchModel")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />
      <div className="flex  justify-between">
        <Checkbox
          checked={selectedModels.length === filteredModels.length}
          indeterminate={
            selectedModels.length > 0 &&
            selectedModels.length < filteredModels.length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}>
          {t("selectAll")}
        </Checkbox>
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          {`${selectedModels?.length} / ${data?.length}`}
        </div>
      </div>
      <div className="space-y-2 custom-scrollbar max-h-[300px] border overflow-y-auto dark:border-gray-600 rounded-md p-3">
        <div className="grid grid-cols-2 gap-4 items-center">
          {filteredModels.map((model) => (
            <Checkbox
              key={model.id}
              checked={selectedModels.includes(model.id)}
              onChange={(e) => handleModelSelect(model.id, e.target.checked)}>
              <div className="max-w-[200px] truncate">
                {`${model?.name || model.id}`.replaceAll(
                  /accounts\/[^\/]+\/models\//g,
                  ""
                )}
              </div>
            </Checkbox>
          ))}
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
        {isSaving ? t("saving") : t("save")}
      </button>
    </div>
  )
}
