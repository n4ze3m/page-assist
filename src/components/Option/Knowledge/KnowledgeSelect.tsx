import { getAllKnowledge } from "@/db/dexie/knowledge"
import { useMessageOption } from "@/hooks/useMessageOption"
import { useQuery } from "@tanstack/react-query"
import { Dropdown, Tooltip } from "antd"
import { Blocks } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "../../Common/IconButton"
import { useStorage } from "@plasmohq/storage/hook"

export const KnowledgeSelect: React.FC = () => {
  const { t } = useTranslation("playground")
  const { setSelectedKnowledge, selectedKnowledge } = useMessageOption()
  const [menuDensity] = useStorage("menuDensity", "comfortable")
  const { data } = useQuery({
    queryKey: ["getAllKnowledge"],
    queryFn: async () => {
      const data = await getAllKnowledge("finished")
      return data
    },
    refetchInterval: 1000
  })

  return (
    <>
      {data && data.length > 0 && (
        <Dropdown
          menu={{
            items:
              data?.map((d) => ({
                key: d.id,
                label: (
                  <div className="w-52 gap-2 text-sm truncate inline-flex items-center leading-5 dark:border-gray-700">
                    <Blocks className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{d.title}</span>
                  </div>
                ),
                onClick: () => {
                  const knowledge = data?.find((k) => k.id === d.id)
                  if (selectedKnowledge?.id === d.id) {
                    setSelectedKnowledge(null)
                  } else {
                    setSelectedKnowledge(knowledge)
                  }
                }
              })) || [],
            style: {
              maxHeight: 500,
              overflowY: "scroll"
            },
            className: `no-scrollbar ${menuDensity === 'compact' ? 'menu-density-compact' : 'menu-density-comfortable'}`,
            activeKey: selectedKnowledge?.id
          }}
          placement={"topLeft"}
          trigger={["click"]}>
          <Tooltip title={t("tooltip.knowledge")}>
            <IconButton
              ariaLabel={(t("tooltip.knowledge") as string) || "Knowledge"}
              hasPopup="menu"
              className="dark:text-gray-300"
              data-playground-knowledge-trigger="true">
              <Blocks className="h-6 w-6" />
            </IconButton>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
