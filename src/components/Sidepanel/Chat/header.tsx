import logoImage from "~/assets/icon.png"
import { useMessage } from "~/hooks/useMessage"
import { Link } from "react-router-dom"
import { Tooltip } from "antd"
import { BoxesIcon, CogIcon, EraserIcon, HistoryIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
export const SidepanelHeader = () => {
  const { clearChat, isEmbedding, messages, streaming } = useMessage()
  const { t } = useTranslation(["sidepanel", "common"])

  return (
    <div className="flex px-3 justify-between bg-white dark:bg-[#171717] border-b border-gray-300 dark:border-gray-700 py-4 items-center">
      <div className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 flex items-center dark:text-white">
        <img
          className="h-6 w-auto"
          src={logoImage}
          alt={t("common:pageAssist")}
        />
        <span className="ml-1 text-sm ">{t("common:pageAssist")}</span>
      </div>

      <div className="flex items-center space-x-3">
        {isEmbedding ? (
          <Tooltip title={t("tooltip.embed")}>
            <BoxesIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 animate-bounce animate-infinite" />
          </Tooltip>
        ) : null}
        {messages.length > 0 && !streaming && (
          <button
            title={t("tooltip.clear")}
            onClick={() => {
              clearChat()
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <EraserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}
        {/* <Tooltip title={t("tooltip.history")}>
          <Link to="/history">
            <HistoryIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Link>
        </Tooltip> */}
        <Link to="/settings">
          <CogIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>
    </div>
  )
}
