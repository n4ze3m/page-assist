import logoImage from "data-base64:~assets/icon.png"
import { useMessage } from "~hooks/useMessage"
import { Link } from "react-router-dom"
import { Tooltip } from "antd"
import { BoxesIcon, CogIcon, RefreshCcw } from "lucide-react"
export const SidepanelHeader = () => {
  const { clearChat, isEmbedding } = useMessage()
  return (
    <div className="flex px-3 justify-between bg-white dark:bg-[#171717] border-b border-gray-300 dark:border-gray-700 py-4 items-center">
      <div className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 flex items-center dark:text-white">
        <img className="h-6 w-auto" src={logoImage} alt="Page Assist" />
        <span className="ml-1 text-sm ">Page Assist</span>
      </div>

      <div className="flex items-center space-x-3">
        {isEmbedding ? (
          <Tooltip title="It may take a few minutes to embed the page. Please wait...">
            <BoxesIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 animate-bounce animate-infinite" />
          </Tooltip>
        ) : null}
        <button
          onClick={() => {
            clearChat()
          }}
          className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
          <RefreshCcw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
        <Link to="/settings">
          <CogIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>
    </div>
  )
}
