import React from "react"
import { useMessageOption } from "~/hooks/useMessageOption"
import { PlaygroundEmpty } from "./PlaygroundEmpty"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"

export const PlaygroundChat = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    isSearchingInternet,
    editMessage,
    ttsEnabled
  } = useMessageOption()
  const divRef = React.useRef<HTMLDivElement>(null)
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  React.useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollIntoView({ behavior: "smooth" })
    }
  })
  return (
    <>
      {" "}
      <div className="grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out">
        {messages.length === 0 && (
          <div className="mt-32">
            <PlaygroundEmpty />
          </div>
        )}
        {/* {messages.length > 0 && <div className="w-full h-16 flex-shrink-0"></div>} */}
        {messages.map((message, index) => (
          <PlaygroundMessage
            key={index}
            isBot={message.isBot}
            message={message.message}
            name={message.name}
            images={message.images || []}
            currentMessageIndex={index}
            totalMessages={messages.length}
            onRengerate={regenerateLastMessage}
            isProcessing={streaming}
            isSearchingInternet={isSearchingInternet}
            sources={message.sources}
            onEditFormSubmit={(value) => {
              editMessage(index, value, !message.isBot)
            }}
            onSourceClick={(data) => {
              setSource(data)
              setIsSourceOpen(true)
            }}
            isTTSEnabled={ttsEnabled}
          />
        ))}
        {messages.length > 0 && (
          <div className="w-full h-32 md:h-48 flex-shrink-0"></div>
        )}
        <div ref={divRef} />
      </div>
      <MessageSourcePopup
        open={isSourceOpen}
        setOpen={setIsSourceOpen}
        source={source}
      />
    </>
  )
}
