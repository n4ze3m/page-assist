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
        className="custom-scrollbar  grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto h-[calc(100vh-160px)]">
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
            onEditFormSubmit={(value, isSend) => {
              editMessage(index, value, !message.isBot, isSend)
            }}
            onSourceClick={(data) => {
              setSource(data)
              setIsSourceOpen(true)
            }}
            isTTSEnabled={ttsEnabled}
            generationInfo={message?.generationInfo}
          />
        ))}
        {messages.length > 0 && (
          <div className="w-full h-10 flex-shrink-0"></div>
        )}
      </div>
      {!isAtBottom && (
        <div className="fixed bottom-36 z-20 left-0 right-0 flex justify-center">
          <button
            onClick={scrollToBottom}
            className="bg-white border border-gray-100 dark:border-none dark:bg-white/20 p-1.5 rounded-full pointer-events-auto">
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
