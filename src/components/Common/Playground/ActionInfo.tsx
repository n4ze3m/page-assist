import { useTranslation } from "react-i18next"
import { ChatActionInfo } from "@/libs/mcp/types"

type Props = {
  action: ChatActionInfo
}


export const ActionInfo = ({action}: Props) => {
  const {t} = useTranslation('common')
  if (typeof action === "string") {
    return (
      <div className="shimmer-text text-[16px]">
        {t(action)}
      </div>
    )
  }

  if (action.type === "mcp") {
    return (
      <div className="shimmer-text text-[16px]">
        {t(`mcp.action.${action.phase}`, {
          tool: action.toolName || t("mcp.tool"),
          server: action.serverName || t("mcp.server"),
          count: action.toolCount || 0
        })}
      </div>
    )
  }

  return (
      <div className="shimmer-text text-[16px]">
        {t("pageAssist")}
      </div>
  )
}
