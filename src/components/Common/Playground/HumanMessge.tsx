import React from "react"
import { useStorage } from "@plasmohq/storage/hook"

const Markdown = React.lazy(() => import("../Markdown"))

type Props = {
  message: string
  isNormalMessage?: boolean
}

export const HumanMessage = ({ message }: Props) => {
   const [useMarkdownForUserMessage] = useStorage("useMarkdownForUserMessage", false)

   if(useMarkdownForUserMessage) {
    return (
      <React.Suspense fallback={<span className="whitespace-pre-wrap">{message}</span>}>
        <Markdown message={message} />
      </React.Suspense>
    )
   }

  return <span className="whitespace-pre-wrap">{message}</span>
}
