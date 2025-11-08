
import React from "react"
import { useTranslation } from "react-i18next"

type PageAssistLoaderProps = {
  label?: string
  description?: string
  fullScreen?: boolean
  autoFocus?: boolean
}

export const PageAssistLoader: React.FC<PageAssistLoaderProps> = ({
  label,
  description,
  fullScreen = true,
  autoFocus = true
}) => {
  const { t } = useTranslation(["common"]) // i18n fallback is provided via defaultValue

  const containerRef = React.useRef<HTMLDivElement>(null)
  const prevActiveRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!autoFocus) return
    prevActiveRef.current = (document.activeElement as HTMLElement) ?? null
    containerRef.current?.focus({ preventScroll: true })
    return () => {
      prevActiveRef.current?.focus?.()
    }
  }, [autoFocus])

  const ariaLabel =
    label || t("common:loading.title", { defaultValue: "Loading…" })
  const ariaDescription =
    description ||
    t("common:loading.description", {
      defaultValue: "Please wait while we get things ready."
    })

  const content = (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="pa-loader-label"
      aria-describedby="pa-loader-desc"
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-black/60 backdrop-blur-[1px]"
          : "w-full"
      }>
      <div className="mx-4 flex max-w-sm flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-6 text-center shadow-lg dark:border-gray-700 dark:bg-[#1a1a1a]">
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-transparent"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={ariaLabel}>
          <svg
            className="h-8 w-8 text-blue-600 dark:text-blue-400 motion-reduce:animate-none animate-spin"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>

        <p
          id="pa-loader-label"
          className="text-base font-medium text-gray-900 dark:text-gray-100"
          role="status"
          aria-live="polite">
          {ariaLabel}
        </p>
        <p
          id="pa-loader-desc"
          className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {ariaDescription}
        </p>
        <span className="sr-only">{ariaLabel}</span>
      </div>
    </div>
  )

  return content
}
