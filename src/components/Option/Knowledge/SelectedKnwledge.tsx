import { Blocks, XIcon } from "lucide-react"
import { useMessageOption } from "@/hooks/useMessageOption"

export const SelectedKnowledge = () => {
  const { selectedKnowledge: knowledge, setSelectedKnowledge } =
    useMessageOption()

  if (!knowledge) return <></>

  return (
    <div className="flex flex-row items-center gap-3">
      <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
        {"/"}
      </span>
      <div className="border flex justify-between items-center rounded-full px-2 py-1 gap-2 bg-gray-100 dark:bg-slate-800 dark:border-slate-700">
        <div className="inline-flex items-center gap-2">
          <Blocks className="h-5 w-5 text-gray-400" />
          <span className="text-xs font-semibold dark:text-gray-100">
            {knowledge.title}
          </span>
        </div>
        <div>
          <button
            onClick={() => setSelectedKnowledge(null)}
            className="flex items-center justify-center   bg-white  dark:bg-[#262626] p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-gray-100">
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
