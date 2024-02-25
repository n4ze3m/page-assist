import { Globe } from "lucide-react"

export const WebSearch = () => {
  return (
    <div className="gradient-border mt-4 flex w-56 items-center gap-4 rounded-lg bg-neutral-100 p-1ccc text-slate-900 dark:bg-neutral-800 dark:text-slate-50">
      <div className="rounded p-1">
        <Globe className="w-6 h-6" />
      </div>
      <div className="text-sm font-semibold">Searching the web</div>
    </div>
  )
}
