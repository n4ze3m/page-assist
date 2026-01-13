import React from "react"
import { Tooltip } from "antd"
import { PaperclipIcon } from "lucide-react"

export type UploadDocumentButtonProps = {
  title: string
  onClick: () => void
  disabled?: boolean
  iconClassName?: string
}

export const UploadDocumentButton: React.FC<UploadDocumentButtonProps> = ({
  title,
  onClick,
  disabled,
  iconClassName
}) => {
  return (
    <Tooltip title={title}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`pa-icon-button ${disabled ? "opacity-50" : ""}`}>
        <PaperclipIcon className={iconClassName ?? "h-5 w-5"} />
      </button>
    </Tooltip>
  )
}
