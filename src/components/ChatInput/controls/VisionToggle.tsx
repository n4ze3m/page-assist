import React from "react"
import { Tooltip } from "antd"
import { EyeIcon, EyeOffIcon } from "lucide-react"

export type VisionToggleProps = {
  title: string
  mode: "normal" | "vision" | "rag"
  onToggle: () => void
  disabled?: boolean
  hidden?: boolean
  iconClassName?: string
}

export const VisionToggle: React.FC<VisionToggleProps> = ({
  title,
  mode,
  onToggle,
  disabled,
  hidden,
  iconClassName
}) => {
  if (hidden) return null
  const isRag = mode === "rag"
  const isVision = mode === "vision"
  return (
    <Tooltip title={title}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isRag}
        className={`pa-icon-button ${isRag ? "hidden" : "block"} ${disabled ? "opacity-50" : ""}`}>
        {isVision ? (
          <EyeIcon className={iconClassName ?? "h-4 w-4"} />
        ) : (
          <EyeOffIcon className={iconClassName ?? "h-4 w-4"} />
        )}
      </button>
    </Tooltip>
  )
}
