import React from "react"
import { Tooltip, Switch } from "antd"
import { PiGlobe, PiGlobeX } from "react-icons/pi"

export type WebSearchToggleProps =
  | {
      variant: "switch"
      title: string
      checked: boolean
      onChange: (checked: boolean) => void
      disabled?: boolean
      size?: "small" | "default"
    }
  | {
      variant: "icon"
      title: string
      active: boolean
      onToggle: () => void
      hidden?: boolean
      disabled?: boolean
      iconClassName?: string
    }

export const WebSearchToggle: React.FC<WebSearchToggleProps> = (props) => {
  if (props.variant === "switch") {
    const { title, checked, onChange, disabled, size = "default" } = props
    return (
      <Tooltip title={title}>
        <div className="inline-flex items-center gap-2">
          <PiGlobe className="h-5 w-5 dark:text-gray-300" />
          <Switch
            size={size}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      </Tooltip>
    )
  }

  const { title, active, onToggle, hidden, disabled, iconClassName } = props
  if (hidden) return null
  return (
    <Tooltip title={title}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`inline-flex items-center gap-2 pa-icon-button ${disabled ? "opacity-50" : ""}`}>
        {active ? (
          <PiGlobe className={iconClassName ?? "h-4 w-4 text-blue-600 dark:text-blue-400"} />
        ) : (
          <PiGlobeX className={iconClassName ?? "h-4 w-4 text-[#404040] dark:text-gray-400"} />
        )}
      </button>
    </Tooltip>
  )
}
