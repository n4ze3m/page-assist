import { PencilIcon } from "lucide-react"
import { useMessage } from "../../../hooks/useMessage"
import { useTranslation } from 'react-i18next';

export const PlaygroundNewChat = () => {
  const { setHistory, setMessages, setHistoryId } = useMessage()
  const { t } = useTranslation('optionChat')

  const handleClick = () => {
    setHistoryId(null)
    setMessages([])
    setHistory([])
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full border bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-100 rounded-md p-2 dark:border-gray-800">
      <PencilIcon className="mx-3 h-5 w-5" aria-hidden="true" />
      <span className="inline-flex font-semibol text-white text-sm">
        {t('newChat')}
      </span>
    </button>
  )
}
