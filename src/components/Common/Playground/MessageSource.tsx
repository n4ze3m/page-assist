import { KnowledgeIcon } from "@/components/Option/Knowledge/KnowledgeIcon"

type Props = {
  source: {
    name?: string
    url?: string
    mode?: string
    type?: string
    pageContent?: string
    content?: string
  }
  onSourceClick?: (source: any) => void
}

export const MessageSource: React.FC<Props> = ({ source, onSourceClick }) => {
  if (source?.mode === "rag" || source?.mode === "chat") {
    return (
      <button
        onClick={() => {
          onSourceClick && onSourceClick(source)
        }}
        className="inline-flex gap-2   cursor-pointer transition-shadow duration-300 ease-in-out hover:shadow-lg  items-center rounded-md bg-gray-100 p-1 text-xs text-gray-800 border border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 opacity-80 hover:opacity-100">
        <KnowledgeIcon type={source.type} className="h-3 w-3" />
        <span className="text-xs">{source.name}</span>
      </button>
    )
  }

  return (
    <a
      href={source?.url}
      target="_blank"
      className="inline-flex cursor-pointer transition-shadow duration-300 ease-in-out hover:shadow-lg  items-center rounded-md bg-gray-100 p-1 text-xs text-gray-800 border border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 opacity-80 hover:opacity-100">
      <span className="text-xs">{source.name}</span>
    </a>
  )
}
