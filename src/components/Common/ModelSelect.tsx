import { useQuery } from "@tanstack/react-query"
import { Avatar, Dropdown, Tooltip } from "antd"
import { LucideBrain } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { fetchChatModels } from "@/services/tldw-server"
import { useMessage } from "@/hooks/useMessage"
import { ProviderIcons } from "./ProviderIcon"
import { IconButton } from "./IconButton"

type Props = {
  iconClassName?: string
}

export const ModelSelect: React.FC<Props> = ({iconClassName = "size-5"}) => {
  const { t } = useTranslation("common")
  const { setSelectedModel, selectedModel } = useMessage()
  const { data } = useQuery({
    queryKey: ["getAllModelsForSelect"],
    queryFn: async () => {
      const models = await fetchChatModels({ returnEmpty: false })
      return models
    }
  })

  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, any[]>()
    const localProviders = new Set(["lmstudio", "llamafile", "ollama", "ollama2", "llamacpp", "vllm", "custom"]) // group as "custom"
    for (const d of data || []) {
      const providerRaw = (d.provider || "other").toLowerCase()
      const groupKey = providerRaw === 'chrome' ? 'default' : (localProviders.has(providerRaw) ? 'custom' : providerRaw)
      const labelNode = (
        <div className="w-52 gap-2 text-lg truncate inline-flex line-clamp-3 items-center dark:border-gray-700">
          <div>
            {d.avatar ? (
              <Avatar src={d.avatar} alt={d.name} size="small" />
            ) : (
              <ProviderIcons provider={d?.provider} className="h-6 w-6 text-gray-400" />
            )}
          </div>
          {d?.nickname || d.model}
        </div>
      )
      const item = {
        key: d.name,
        label: labelNode,
        onClick: () => {
          if (selectedModel === d.model) {
            setSelectedModel(null)
          } else {
            setSelectedModel(d.model)
          }
        }
      }
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey)!.push(item)
    }
    // Build grouped menu items
    const items: any[] = []
    for (const [groupKey, children] of groups) {
      const labelText = groupKey === 'default' ? 'Default' : (groupKey === 'custom' ? 'Custom' : groupKey)
      const iconKey = groupKey === 'default' ? 'chrome' : groupKey
      items.push({
        type: 'group',
        key: `group-${groupKey}`,
        label: (
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <ProviderIcons provider={iconKey} className="h-4 w-4" />
            <span>{labelText}</span>
          </div>
        ),
        children
      })
    }
    return items
  }, [data, selectedModel, setSelectedModel])

  return (
    <>
      {data && data.length > 0 && (
        <Dropdown
          menu={{
            items: groupedItems,
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
            <IconButton
              ariaLabel={t("selectAModel") as string}
              hasPopup="menu"
              className="dark:text-gray-300">
              <LucideBrain className={iconClassName} />
            </IconButton>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
