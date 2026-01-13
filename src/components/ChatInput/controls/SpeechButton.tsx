import React from "react"
import { Tooltip } from "antd"
import { MicIcon } from "lucide-react"

export type SpeechButtonProps = {
  title: string
  isListening: boolean
  onToggle: () => void
  iconClassName?: string // default sizes differ between places
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({
  title,
  isListening,
  onToggle,
  iconClassName
}) => {
  return (
    <Tooltip title={title}>
      <button type="button" onClick={onToggle} className="pa-icon-button">
        {!isListening ? (
          <MicIcon className={iconClassName ?? "h-5 w-5"} />
        ) : (
          <div className="relative">
            <span className="animate-ping absolute inline-flex rounded-full bg-red-400 opacity-75" style={{ width: 10, height: 10 }}></span>
            <MicIcon className={iconClassName ?? "h-5 w-5"} />
          </div>
        )}
      </button>
    </Tooltip>
  )
}
