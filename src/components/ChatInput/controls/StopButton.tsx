import React from "react"
import { Tooltip } from "antd"
import { StopCircle } from "lucide-react"

export type StopButtonProps = {
  title: string
  onStop: () => void
  iconClassName?: string // defaults to h-5 w-5
}

export const StopButton: React.FC<StopButtonProps> = ({
  title,
  onStop,
  iconClassName
}) => {
  return (
    <Tooltip title={title}>
      <button type="button" onClick={onStop} className="pa-icon-button">
        <StopCircle className={iconClassName ?? "h-5 w-5"} />
      </button>
    </Tooltip>
  )
}
