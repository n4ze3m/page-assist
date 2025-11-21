import { SquarePen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useMessageOption } from "@/hooks/useMessageOption"

type Props = {
  clearChat: () => void
}

export const NewChat: React.FC<Props> = ({ clearChat }) => {
  const { t } = useTranslation(["option", "common"])

  const { temporaryChat, setTemporaryChat, messages } = useMessageOption()

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={clearChat}
        className="inline-flex dark:bg-transparent bg-white items-center rounded-s-lg rounded-e-none border dark:border-gray-700 bg-transparent px-3 py-2.5 pe-6 text-xs lg:text-sm font-medium leading-4 text-gray-800 dark:text-white disabled:opacity-50 ease-in-out transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white">
        <SquarePen className="size-4 sm:size-5" />
        <span className="truncate ms-3 hidden sm:inline">{t("newChat")}</span>
      </button>
      
      {/* </Dropdown> */}
    </div>
  )
}
