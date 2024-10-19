import React from "react"
import { useMessageOption } from "~/hooks/useMessageOption"
import { PlaygroundEmpty } from "./PlaygroundEmpty"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"
import { useSmartScroll } from "~/hooks/useSmartScroll"
import { ChevronDown } from "lucide-react"

export const PlaygroundChat = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    isSearchingInternet,
    editMessage,
    ttsEnabled
  } = useMessageOption()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)

  const { containerRef, isAtBottom, scrollToBottom } = useSmartScroll(
    messages,
    streaming
  )

  return (
    <>
      <div
        ref={containerRef}
        className="custom-scrollbar grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto h-[calc(100vh-200px)]">
        {messages.length === 0 && (
          <div className="mt-32">
            <PlaygroundEmpty />
          </div>
        )}
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
          <div className="w-full h-16 flex-shrink-0"></div>
        )}
      </div>
      {!isAtBottom && (
        <div className="fixed md:bottom-44 bottom-36 z-[99999] left-0 right-0 flex justify-center">
          <button
            onClick={scrollToBottom}
            className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full shadow-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
            <ChevronDown className="size-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}
      <MessageSourcePopup
        open={isSourceOpen}
        setOpen={setIsSourceOpen}
        source={source}
      />
    </>
  )
}
