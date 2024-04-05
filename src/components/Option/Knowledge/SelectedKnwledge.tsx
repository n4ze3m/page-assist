import { Knowledge } from "@/db/knowledge"
import { XIcon } from "lucide-react"
import { KnowledgeIcon } from "./KnowledgeIcon"

type Props = {
  knowledge: Knowledge
  onClose: () => void
}

export const SelectedKnowledge = ({ knowledge, onClose }: Props) => {
  return (
    <div className="mb-3 border flex justify-between items-center rounded-md p-2 dark:border-gray-600">
      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-semibold dark:text-gray-100">
            {knowledge.title}
          </h3>
        </div>
        <div className="flex flex-row overflow-x-auto gap-2 w-full">
          {knowledge.source.map((source, index) => (
            <div
              key={index}
              className="inline-flex gap-2 text-xs border rounded-md p-1 dark:border-gray-600 dark:text-gray-100">
              <KnowledgeIcon type={source.type} className="w-4 h-4" />
              {source.filename}
            </div>
          ))}
        </div>
      </div>
      <div>
        <button
          onClick={onClose}
          className="flex items-center justify-center   bg-white  dark:bg-[#262626] p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-gray-100">
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
