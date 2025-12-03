import React from "react"

export interface StatusBadgeProps {
  variant: "demo" | "warning" | "error"
  children: React.ReactNode
}

const VARIANT_CLASSES: Record<StatusBadgeProps["variant"], string> = {
  demo:
    "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  warning:
    "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200",
  error:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children
}) => {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  )
}

export default StatusBadge

