import { useDynamicStorage } from "@/hooks/useDynamicStorage"
import Markdown from "../Markdown"

type Props = {
  message: string
  isNormalMessage?: boolean
}

export const HumanMessage = ({ message }: Props) => {
   const [useMarkdownForUserMessage] = useDynamicStorage("useMarkdownForUserMessage", false)

   if(useMarkdownForUserMessage) {
    return <Markdown message={message} />
   }

  return <span className="whitespace-pre-wrap">{message}</span>
}
