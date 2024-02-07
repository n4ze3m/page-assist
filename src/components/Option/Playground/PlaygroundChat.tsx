import React from "react"
import { useMessage } from "~hooks/useMessage"
import { useMessageOption } from "~hooks/useMessageOption"
import { PlaygroundMessage } from "./PlaygroundMessage"
import { PlaygroundEmpty } from "./PlaygroundEmpty"

export const PlaygroundChat = () => {
  const { messages } = useMessageOption()
  const divRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollIntoView({ behavior: "smooth" })
    }
  })
  return (
    <div className="grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out">
      {messages.length === 0 && (
        <div className="mt-32">
          <PlaygroundEmpty />
        </div>
      )}
      {messages.length > 0 && <div className="w-full h-14 flex-shrink-0"></div>}
      {messages.map((message, index) => (
        <PlaygroundMessage
          key={index}
          isBot={message.isBot}
          message={message.message}
          name={message.name}
          images={message.images || []}
        />
      ))}
      {messages.length > 0 && (
        <div className="w-full h-32 md:h-48 flex-shrink-0"></div>
      )}
      <div ref={divRef} />
    </div>
  )
}
