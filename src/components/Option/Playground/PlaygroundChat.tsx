import React from "react"
import { useMessageOption } from "~/hooks/useMessageOption"
import { PlaygroundEmpty } from "./PlaygroundEmpty"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"
import { useStorage } from "@plasmohq/storage/hook"

export const PlaygroundChat = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    isSearchingInternet,
    editMessage,
    ttsEnabled,
    onSubmit
  } = useMessageOption()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  const [openReasoning] = useStorage("openReasoning", false)

  return (
    <>
      <div className="relative flex w-full flex-col items-center pt-16 pb-4">
        {messages.length === 0 && (
          <div className="mt-32 w-full">
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
            isStreaming={streaming}
            reasoningTimeTaken={message?.reasoning_time_taken}
            openReasoning={openReasoning}
            modelImage={message?.modelImage}
            modelName={message?.modelName}
            onContinue={() => {
              onSubmit({
                image: "",
                message: "",
                isContinue: true
              })
            }}
          />
        ))}
      </div>
      <div className="w-full pb-[157px]"></div>

      <MessageSourcePopup
        open={isSourceOpen}
        setOpen={setIsSourceOpen}
        source={source}
      />
    </>
  )
}
