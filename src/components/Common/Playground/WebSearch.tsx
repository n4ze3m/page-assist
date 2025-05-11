import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

export const WebSearch = () => {
  const { t } = useTranslation("common")
  return (
    <div className="shimmer-container mt-4 flex w-56 items-center gap-4 rounded-lg bg-neutral-100 p-1 text-slate-900 dark:bg-neutral-800 dark:text-slate-50">
      <div className="rounded p-1">
        <Globe className="size-4" />
      </div>
      <div className="shimmer-text text-sm font-semibold text-gray-500 dark:text-gray-500 line-clamp-1 text-wrap">
        {t("webSearch")}
      </div>
    </div>
  )
}
