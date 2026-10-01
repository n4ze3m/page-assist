import React from "react"
import { Tooltip } from "antd"

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
          <svg
            className={iconClassName ?? "h-4 w-4"}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M2.5 5A2.5 2.5 0 0 0 0 7.5C0 12.5 4.5 17 12 17s12-4.5 12-9.5A2.5 2.5 0 0 0 21.5 5c-2.5 0-5 1-7.5 2.5C11.5 6 9 5 6.5 5z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        ) : (
          <svg
            className={iconClassName ?? "h-4 w-4"}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        )}
      </button>
    </Tooltip>
  )
}
