import { useStorage } from "@plasmohq/storage/hook"
import Markdown from "../Markdown"

type Props = {
  message: string
  isNormalMessage?: boolean
}

export const HumanMessage = ({ message }: Props) => {
   const [useMarkdownForUserMessage] = useStorage("useMarkdownForUserMessage", false)

   if(useMarkdownForUserMessage) {
    return <Markdown message={message} />
   }

  return <span className="whitespace-pre-wrap">{message}</span>
}
