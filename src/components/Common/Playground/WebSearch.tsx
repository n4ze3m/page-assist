import { useWebSearch } from "~store/web"
import {
  Globe,
  MousePointer,
  Boxes
} from "lucide-react"


export const WebSearch = () => {
  const { state, text } = useWebSearch()
  return (
    <div className="gradient-border mt-4 flex w-56 items-center gap-4 rounded-lg bg-neutral-100 p-1ccc text-slate-900 dark:bg-neutral-800 dark:text-slate-50">
      <div className="rounded p-1">
        
      </div>
      <div className="text-sm font-semibold">{text}</div>
    </div>
  )
}
