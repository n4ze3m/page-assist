import React from "react"
import { Tooltip } from "antd"
import { StopCircleIcon } from "lucide-react"

export type StopButtonProps = {
  title: string
  onStop: () => void
  sizeClassName?: string // defaults to size-5
}

export const StopButton: React.FC<StopButtonProps> = ({ title, onStop, sizeClassName }) => {
  return (
    <Tooltip title={title}>
      <button
        type="button"
        onClick={onStop}
        className="pa-icon-button border border-gray-300 dark:border-[#404040] rounded-md p-1">
        <StopCircleIcon className={sizeClassName ?? "size-5"} />
      </button>
    </Tooltip>
  )
}
