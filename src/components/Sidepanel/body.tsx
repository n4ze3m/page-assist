import React from "react"
import { PlaygroundMessage } from "~components/Common/Playground/Message"
import { useMessage } from "~hooks/useMessage"
import { EmptySidePanel } from "./empty"

export const SidePanelBody = () => {
  const { messages } = useMessage()
  const divRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollIntoView({ behavior: "smooth" })
    }
  })
  return (
    <div className="grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out">
      {messages.length === 0 && <EmptySidePanel />}
      {messages.map((message, index) => (
        <PlaygroundMessage
          key={index}
          isBot={message.isBot}
          message={message.message}
        />
      ))}
      <div className="w-full h-32 md:h-48 flex-shrink-0"></div>
      <div ref={divRef} />
    </div>
  )
}
