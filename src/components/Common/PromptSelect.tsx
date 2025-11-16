import { useQuery } from "@tanstack/react-query"
import { Dropdown, Empty, Tooltip } from "antd"
import { BookIcon, ComputerIcon, ZapIcon } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { getAllPrompts } from "@/db/dexie/helpers"
import { useStorage } from "@plasmohq/storage/hook"
import { IconButton } from "./IconButton"

type Props = {
  setSelectedSystemPrompt: (promptId: string | undefined) => void
  setSelectedQuickPrompt: (prompt: string | undefined) => void
  selectedSystemPrompt: string | undefined
  className?: string
  iconClassName?: string
}

export const PromptSelect: React.FC<Props> = ({
  setSelectedQuickPrompt,
  setSelectedSystemPrompt,
  selectedSystemPrompt,
  className = "dark:text-gray-300",
  iconClassName = "size-5"
}) => {
  const { t } = useTranslation("option")
  const [menuDensity] = useStorage("menuDensity", "comfortable")

  const { data } = useQuery({
    queryKey: ["getAllPromptsForSelect"],
    queryFn: getAllPrompts
  })

  const handlePromptChange = (value?: string) => {
    if (!value) {
      setSelectedSystemPrompt(undefined)
      setSelectedQuickPrompt(undefined)
      return
    }
    const prompt = data?.find((prompt) => prompt.id === value)
    if (prompt?.is_system) {
      setSelectedSystemPrompt(prompt.id)
    } else {
      setSelectedSystemPrompt(undefined)
      setSelectedQuickPrompt(prompt!.content)
    }
  }
  return (
    <>
      {data && (
        <Dropdown
          menu={{
            items:
              data.length > 0
                ? [...data]
                    .sort(
                      (a: any, b: any) => Number(!!b.favorite) - Number(!!a.favorite)
                    )
                    .map((prompt: any) => ({
                    key: prompt.id,
                    label: (
                      <div className="w-52 gap-2 text-sm truncate inline-flex items-center leading-5 dark:border-gray-700">
                        <span key={prompt.title} className="flex flex-row gap-2 items-center">
                          {prompt.is_system ? (
                            <ComputerIcon className="w-4 h-4" />
                          ) : (
                            <ZapIcon className="w-4 h-4" />
                          )}
                          {prompt?.favorite && (
                            <span className="text-yellow-500" title="Favorite">★</span>
                          )}
                          <span className="truncate">{prompt.title}</span>
                        </span>
                      </div>
                    ),
                    onClick: () => {
                      if (selectedSystemPrompt === prompt.id) {
                        setSelectedSystemPrompt(undefined)
                      } else {
                        handlePromptChange(prompt.id)
                      }
                    }
                  }))
                : [
                    {
                      key: "empty",
                      label: <Empty />
                    }
                  ],
            style: {
              maxHeight: 500,
              overflowY: "scroll"
            },
            className: `no-scrollbar ${menuDensity === 'compact' ? 'menu-density-compact' : 'menu-density-comfortable'}`,
            activeKey: selectedSystemPrompt
          }}
          placement={"topLeft"}
          trigger={["click"]}>
          <Tooltip title={t("selectAPrompt")}>
            <IconButton
              ariaLabel={t("selectAPrompt") as string}
              hasPopup="menu"
              className={className}>
              <BookIcon className={iconClassName} />
            </IconButton>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
