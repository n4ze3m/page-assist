import { SquarePen, MoreHorizontal, TimerReset } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Dropdown, Switch } from "antd"
import type { MenuProps } from "antd"
import { useMessageOption } from "@/hooks/useMessageOption"

type Props = {
  clearChat: () => void
}

export const NewChat: React.FC<Props> = ({ clearChat }) => {
  const { t } = useTranslation(["option", "common"])

  const { temporaryChat, setTemporaryChat, messages } = useMessageOption()

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <label className="flex items-center gap-6 justify-between px-1 py-0.5 cursor-pointer w-full">
          <div className="flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-gray-600" />
            <span>
                {t("temporaryChat")}
            </span>
          </div>
          <Switch
            checked={temporaryChat}
            onChange={(checked) => {
              setTemporaryChat(checked)
              // just like chatgpt
              if (messages.length > 0) {
                clearChat()
              }
            }}
            size="small"
          />
        </label>
      )
    }
  ]
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={clearChat}
        className="inline-flex dark:bg-transparent bg-white items-center rounded-s-lg rounded-e-none border dark:border-gray-700 bg-transparent px-3 py-2.5 pe-6 text-xs lg:text-sm font-medium leading-4 text-gray-800 dark:text-white disabled:opacity-50 ease-in-out transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white">
        <SquarePen className="h-5 w-5" />
        <span className="truncate ms-3">{t("newChat")}</span>
      </button>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <button className="inline-flex dark:bg-transparent bg-white items-center rounded-lg border-s-0 rounded-s-none border dark:border-gray-700 bg-transparent px-3 py-2.5 text-xs lg:text-sm font-medium leading-4 text-gray-800 dark:text-white disabled:opacity-50 ease-in-out transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white">
          <MoreHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </Dropdown>
    </div>
  )
}