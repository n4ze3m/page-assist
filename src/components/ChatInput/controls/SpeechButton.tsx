import React from "react"
import { Tooltip } from "antd"

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
          <svg
            className={iconClassName ?? "h-5 w-5"}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        ) : (
          <div className="relative">
            <span
              className="animate-ping absolute inline-flex rounded-full bg-red-400 opacity-75"
              style={{ width: 10, height: 10 }}></span>
            <svg
              className={iconClassName ?? "h-5 w-5"}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
        )}
      </button>
    </Tooltip>
  )
}
