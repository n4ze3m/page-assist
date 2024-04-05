import { CSVIcon } from "@/components/Icons/CSVIcon"
import { PDFIcon } from "@/components/Icons/PDFIcon"
import { TXTIcon } from "@/components/Icons/TXTIcon"

type Props = {
  type: string
  className?: string
}

export const KnowledgeIcon = ({ type, className = "w-6 h-6" }: Props) => {
  if (type === "pdf" || type === "application/pdf") {
    return <PDFIcon className={className} />
  } else if (type === "csv" || type === "text/csv") {
    return <CSVIcon className={className} />
  } else if (type === "txt" || type === "text/plain") {
    return <TXTIcon className={className} />
  }
}
