import React from "react"
import { Button } from "antd"

type FeatureEmptyStateProps = {
  title: React.ReactNode
  description?: React.ReactNode
  examples?: React.ReactNode[]
  primaryActionLabel?: React.ReactNode
  onPrimaryAction?: () => void
  secondaryActionLabel?: React.ReactNode
  onSecondaryAction?: () => void
  className?: string
  primaryDisabled?: boolean
  secondaryDisabled?: boolean
}

const FeatureEmptyState: React.FC<FeatureEmptyStateProps> = ({
  title,
  description,
  examples,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  primaryDisabled = false,
  secondaryDisabled = false
}) => {
  return (
    <div
      className={
        "mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-200 " +
        (className || "")
      }>
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {description}
          </p>
        )}
        {examples && examples.length > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-300">
            <ul className="list-disc pl-4 space-y-1">
              {examples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        )}
        {(primaryActionLabel || secondaryActionLabel) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {primaryActionLabel && (
              <Button
                type="primary"
                size="small"
                onClick={onPrimaryAction}
                className="mr-1"
                disabled={primaryDisabled}>
                {primaryActionLabel}
              </Button>
            )}
            {secondaryActionLabel && (
              <Button
                size="small"
                onClick={onSecondaryAction}
                disabled={secondaryDisabled}>
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FeatureEmptyState
