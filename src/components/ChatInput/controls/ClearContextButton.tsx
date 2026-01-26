import React from "react"
import { Tooltip } from "antd"
import { EraserIcon } from "lucide-react"

export type ClearContextButtonProps = {
  title: string
  onClear: () => void
  hidden?: boolean
}

export const ClearContextButton: React.FC<ClearContextButtonProps> = ({ title, onClear, hidden }) => {
  if (hidden) return null
  return (
    <Tooltip title={title}>
      <button type="button" onClick={onClear} className="pa-icon-button">
        <EraserIcon className="h-5 w-5" />
      </button>
    </Tooltip>
  )
}
