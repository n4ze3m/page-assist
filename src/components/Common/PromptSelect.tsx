import { useQuery } from "@tanstack/react-query"
import { Dropdown, Empty, Tooltip } from "antd"
import { BookIcon, ComputerIcon, ZapIcon } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { getAllPrompts } from "@/db"

type Props = {
  setSelectedSystemPrompt: (promptId: string | undefined) => void
  setSelectedQuickPrompt: (prompt: string | undefined) => void
  selectedSystemPrompt: string | undefined
  className?: string
}

export const PromptSelect: React.FC<Props> = ({
  setSelectedQuickPrompt,
  setSelectedSystemPrompt,
  selectedSystemPrompt,
  className = "dark:text-gray-300"
}) => {
  const { t } = useTranslation("option")

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
                ? data?.map((prompt) => ({
                    key: prompt.id,
                    label: (
                      <div className="w-52 gap-2 text-lg truncate inline-flex line-clamp-3  items-center  dark:border-gray-700">
                        <span
                          key={prompt.title}
                          className="flex flex-row gap-3 items-center">
                          {prompt.is_system ? (
                            <ComputerIcon className="w-4 h-4" />
                          ) : (
                            <ZapIcon className="w-4 h-4" />
                          )}
                          {prompt.title}
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
            className: "no-scrollbar",
            activeKey: selectedSystemPrompt
          }}
          placement={"topLeft"}
          trigger={["click"]}>
          <Tooltip title={t("selectAPrompt")}>
            <button type="button" className={className}>
              <BookIcon className="h-5 w-5" />
            </button>
          </Tooltip>
        </Dropdown>
      )}
    </>
  )
}
