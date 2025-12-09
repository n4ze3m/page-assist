import React from "react"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"

type ConnectionProblemBannerProps = {
  badgeLabel?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  examples?: React.ReactNode[]
  primaryActionLabel?: React.ReactNode
  onPrimaryAction?: () => void
  retryActionLabel?: React.ReactNode
  onRetry?: () => void
  retryDisabled?: boolean
  secondaryActionLabel?: React.ReactNode
  onSecondaryAction?: () => void
  primaryDisabled?: boolean
  secondaryDisabled?: boolean
  className?: string
}

const ConnectionProblemBanner: React.FC<ConnectionProblemBannerProps> = ({
  badgeLabel,
  title,
  description,
  examples,
  primaryActionLabel,
  onPrimaryAction,
  retryActionLabel,
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
  primaryDisabled,
  secondaryDisabled,
  className
}) => {
  const composedTitle = badgeLabel ? (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
        {badgeLabel}
      </span>
      <span>{title}</span>
    </span>
  ) : (
    title
  )

  return (
    <div className={className}>
      <FeatureEmptyState
        title={composedTitle}
        description={description}
        examples={examples}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        secondaryActionLabel={secondaryActionLabel}
        onSecondaryAction={onSecondaryAction}
        primaryDisabled={primaryDisabled}
        secondaryDisabled={secondaryDisabled}
      />
      {retryActionLabel && onRetry && (
        <div className="mt-2 flex justify-start text-xs">
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 ${
              retryDisabled ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {retryActionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

export default ConnectionProblemBanner
