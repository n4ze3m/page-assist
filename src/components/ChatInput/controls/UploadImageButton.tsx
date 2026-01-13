import React from "react"
import { Tooltip } from "antd"
import { ImageIcon } from "lucide-react"

export type UploadImageButtonProps = {
  title: string
  onClick: () => void
  hidden?: boolean
  disabled?: boolean
  iconClassName?: string
}

export const UploadImageButton: React.FC<UploadImageButtonProps> = ({
  title,
  onClick,
  hidden,
  disabled,
  iconClassName
}) => {
  if (hidden) return null
  return (
    <Tooltip title={title}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`pa-icon-button ${disabled ? "opacity-50" : ""}`}>
        <ImageIcon className={iconClassName ?? "h-5 w-5"} />
      </button>
    </Tooltip>
  )
}
