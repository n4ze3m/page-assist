import { useQuery } from "@tanstack/react-query"
import { Avatar, Dropdown, Tooltip } from "antd"
import { LucideBrain } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"
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
  const [menuDensity] = useStorage("menuDensity", "comfortable")
  const { data } = useQuery({
    queryKey: ["getAllModelsForSelect"],
    queryFn: async () => {
      const models = await fetchChatModels({ returnEmpty: false })
      return models
    }
  })

  const groupedItems = React.useMemo(() => {
    const providerDisplayName = (provider?: string) => {
      const key = String(provider || "unknown").toLowerCase()
      if (key === "openai") return "OpenAI"
      if (key === "anthropic") return "Anthropic"
      if (key === "google") return "Google"
      if (key === "mistral") return "Mistral"
      if (key === "cohere") return "Cohere"
      if (key === "groq") return "Groq"
      if (key === "huggingface") return "HuggingFace"
      if (key === "openrouter") return "OpenRouter"
      if (key === "ollama") return "Ollama"
      if (key === "llama") return "Llama.cpp"
      if (key === "kobold") return "Kobold.cpp"
      if (key === "ooba") return "Oobabooga"
      if (key === "tabby") return "TabbyAPI"
      if (key === "vllm") return "vLLM"
      if (key === "aphrodite") return "Aphrodite"
      if (key === "zai") return "Z.AI"
      if (key === "custom_openai_api") return "Custom OpenAI API"
      if (key === "chrome") return "Chrome"
      return provider || "API"
    }

    const groups = new Map<string, any[]>()
    const localProviders = new Set(["lmstudio", "llamafile", "ollama", "ollama2", "llamacpp", "vllm", "custom"]) // group as "custom"
    for (const d of data || []) {
      const providerRaw = (d.provider || "other").toLowerCase()
      const groupKey = providerRaw === 'chrome' ? 'default' : (localProviders.has(providerRaw) ? 'custom' : providerRaw)
      const providerLabel = providerDisplayName(d.provider)
      const modelLabel = d.nickname || d.model
      const caps: string[] = Array.isArray(d.details?.capabilities)
        ? d.details.capabilities
        : []
      const hasVision = caps.includes("vision")
      const hasTools = caps.includes("tools")
      const hasFast = caps.includes("fast")

      const labelNode = (
        <div className="w-52 gap-2 text-sm truncate inline-flex items-center leading-5 dark:border-gray-700">
          <div>
            {d.avatar ? (
              <Avatar src={d.avatar} alt={d.name} size="small" />
            ) : (
              <ProviderIcons provider={d?.provider} className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate">
              {providerLabel} - {modelLabel}
            </span>
            {(hasVision || hasTools || hasFast) && (
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                {hasVision && (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100">
                    Vision
                  </span>
                )}
                {hasTools && (
                  <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-100">
                    Tools
                  </span>
                )}
                {hasFast && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
                    Fast
                  </span>
                )}
              </div>
            )}
          </div>
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
          <div className="flex items-center gap-1.5 text-xs leading-4 font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <ProviderIcons provider={iconKey} className="h-3 w-3" />
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
            className: `no-scrollbar ${menuDensity === 'compact' ? 'menu-density-compact' : 'menu-density-comfortable'}`,
            activeKey: selectedModel
          }}
          placement={"topLeft"}
          trigger={["click"]}>
          <Tooltip title={t("selectAModel")}>
            <IconButton
              ariaLabel={t("selectAModel") as string}
              hasPopup="menu"
              className="dark:text-gray-300 px-2">
              <LucideBrain className={iconClassName} />
              <span className="ml-1 hidden sm:inline text-xs">
                {t("modelSelect.label", "Model")}
              </span>
            </IconButton>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
