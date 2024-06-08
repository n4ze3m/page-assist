import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

export const WebSearch = () => {
  const {t} = useTranslation('common')
  return (
    <div className="animated-gradient-border mt-4 flex w-56 items-center gap-4 !rounded-lg bg-neutral-100 p-1 text-slate-900 dark:bg-neutral-800 dark:text-slate-50">
      <div className="rounded p-1">
        <Globe className="w-6 h-6" />
      </div>
      <div className="text-sm font-semibold">
        {t('webSearch')}
      </div>
    </div>
  )
}
