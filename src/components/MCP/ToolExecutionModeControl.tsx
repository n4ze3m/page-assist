import { McpToolExecutionMode } from "@/libs/mcp/types"
import { Tooltip } from "antd"
import { BanIcon, CheckCircle2Icon, HandIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

export const ToolExecutionModeControl = ({
  value,
  onChange,
  humanInLoopEnabled
}: {
  value: McpToolExecutionMode
  onChange: (value: McpToolExecutionMode) => void
  humanInLoopEnabled: boolean
}) => {
  const { t } = useTranslation(["settings", "common"])

  const items = [
    {
      mode: "allow" as const,
      icon: CheckCircle2Icon,
      title: t(
        "mcpSettings.toolModes.allow",
        "Allow without human-in-the-loop"
      )
    },
    {
      mode: "human_in_loop" as const,
      icon: HandIcon,
      title: humanInLoopEnabled
        ? t(
            "mcpSettings.toolModes.humanInLoop",
            "Require human-in-the-loop approval"
          )
        : t(
            "mcpSettings.toolModes.humanInLoopDisabled",
            "Stored now and used only when global human-in-the-loop is enabled"
          )
    },
    {
      mode: "disabled" as const,
      icon: BanIcon,
      title: t("mcpSettings.toolModes.disabled", "Disable tool")
    }
  ]

  return (
    <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-gray-100  dark:border-white/10 dark:bg-[#1f1f1f]">
      {items.map(({ mode, icon: Icon, title }) => {
        const isActive = value === mode

        return (
          <Tooltip key={mode} title={title}>
            <button
              type="button"
              aria-label={title}
              onClick={() => onChange(mode)}
              className={`inline-flex size-7 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm dark:bg-black/40 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}>
              <Icon className="size-3" />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}