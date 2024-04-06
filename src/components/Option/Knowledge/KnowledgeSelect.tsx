import { getAllKnowledge } from "@/db/knowledge"
import { useMessageOption } from "@/hooks/useMessageOption"
import { useQuery } from "@tanstack/react-query"
import { Dropdown, Tooltip } from "antd"
import { Blocks } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"

export const KnowledgeSelect: React.FC = () => {
  const { t } = useTranslation("playground")
  const { setSelectedKnowledge, selectedKnowledge } = useMessageOption()
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
                  <div className="w-52 gap-2 text-lg truncate inline-flex line-clamp-3  items-center  dark:border-gray-700">
                    <div>
                      <Blocks className="h-6 w-6 text-gray-400" />
                    </div>
                    {d.title}
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
            className: "no-scrollbar",
            activeKey: selectedKnowledge?.id
          }}
          placement={"topLeft"}
          trigger={["click"]}>
          <Tooltip title={t("tooltip.knowledge")}>
            <button type="button" className="dark:text-gray-300">
              <Blocks className="h-6 w-6" />
            </button>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
