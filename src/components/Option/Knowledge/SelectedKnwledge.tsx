import { Blocks, XIcon } from "lucide-react"
import { useMessageOption } from "@/hooks/useMessageOption"
import { Tooltip } from "antd"

export const SelectedKnowledge = () => {
  const { selectedKnowledge: knowledge, setSelectedKnowledge } =
    useMessageOption()

  if (!knowledge) return <></>

  return (
    <div className="flex  flex-row items-center gap-3">
      <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
        {"/"}
      </span>
      <div className="border flex  justify-between items-center rounded-full px-2 py-1 gap-2 bg-gray-100 dark:bg-slate-800 dark:border-slate-700">
        <Tooltip
        title={knowledge.title}
        >
        <div className="inline-flex items-center gap-2 max-w-[150px]">
          <Blocks className="h-5  w-5 text-gray-400 flex-shrink-0" />
          <span className="text-xs hidden lg:inline-block font-semibold dark:text-gray-100 truncate">
            {knowledge.title}
          </span>
        </div>
        </Tooltip>
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