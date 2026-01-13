import React from "react"
import { Tooltip, Popover, Radio, Select } from "antd"
import { Brain, BrainCircuit } from "lucide-react"

export type ThinkingControlsProps =
  | {
      mode: "ossLevels"
      title: string
      value: "low" | "medium" | "high"
      onChange: (level: "low" | "medium" | "high") => void
      labels: { low: string; medium: string; high: string }
      iconClassName?: string
    }
  | {
    mode: "toggle"
    title: string
    enabled: boolean
    onToggle: (enabled: boolean) => void
    iconClassName?: string
  }

export const ThinkingControls: React.FC<ThinkingControlsProps> = (props) => {
  if (props.mode === "ossLevels") {
    const { title, value, onChange, labels, iconClassName } = props
    return (
      <Popover
        content={
          <div>
            <Radio.Group
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex flex-col gap-2">
              <Radio value="low">{labels.low}</Radio>
              <Radio value="medium">{labels.medium}</Radio>
              <Radio value="high">{labels.high}</Radio>
            </Radio.Group>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1 border-t border-gray-200 dark:border-gray-700 pt-2">
              Note: This model always includes reasoning
            </div>
          </div>
        }
        title={title}
        trigger="click">
        <Tooltip title={title}>
          <button type="button" className="inline-flex items-center gap-2">
            <Brain className={iconClassName ?? "h-4 w-4 text-blue-600 dark:text-blue-400"} />
          </button>
        </Tooltip>
      </Popover>
    )
  }

  const { title, enabled, onToggle, iconClassName } = props
  return (
    <Tooltip title={title}>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="inline-flex items-center gap-2">
        {enabled ? (
          <Brain className={iconClassName ?? "h-4 w-4 text-blue-600 dark:text-blue-400"} />
        ) : (
          <BrainCircuit className={iconClassName ?? "h-4 w-4 text-[#404040] dark:text-gray-400"} />
        )}
      </button>
    </Tooltip>
  )
}
