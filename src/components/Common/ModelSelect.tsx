import { useQuery } from "@tanstack/react-query"
import { Dropdown, Tooltip } from "antd"
import { LucideBrain } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { fetchChatModels } from "@/services/ollama"
import { useMessage } from "@/hooks/useMessage"
import { ProviderIcons } from "./ProviderIcon"

export const ModelSelect: React.FC = () => {
  const { t } = useTranslation("common")
  const { setSelectedModel, selectedModel } = useMessage()
  const { data } = useQuery({
    queryKey: ["getAllModelsForSelect"],
    queryFn: async () => {
      const models = await fetchChatModels({ returnEmpty: false })
      return models
    }
  })

  return (
    <>
      {data && data.length > 0 && (
        <Dropdown
          menu={{
            items:
              data?.map((d) => ({
                key: d.name,
                label: (
                  <div className="w-52 gap-2 text-lg truncate inline-flex line-clamp-3  items-center  dark:border-gray-700">
                    <div>
                      <ProviderIcons
                        provider={d?.provider}
                        className="h-6 w-6 text-gray-400"
                      />
                    </div>
                    {d.name}
                  </div>
                ),
                onClick: () => {
                  if (selectedModel === d.model) {
                    setSelectedModel(null)
                  } else {
                    setSelectedModel(d.model)
                  }
                }
              })) || [],
            style: {
              maxHeight: 500,
              overflowY: "scroll"
            },
            className: "no-scrollbar",
            activeKey: selectedModel
          }}
          placement={"topLeft"}
          trigger={["click"]}>
          <Tooltip title={t("selectAModel")}>
            <button type="button" className="dark:text-gray-300">
              <LucideBrain className="h-5 w-5" />
            </button>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
