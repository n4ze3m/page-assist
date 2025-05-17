import React from "react"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { useMessage } from "~/hooks/useMessage"
import { EmptySidePanel } from "../Chat/empty"
import { useWebUI } from "@/store/webui"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"

export const SidePanelBody = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    editMessage,
    isSearchingInternet
  } = useMessage()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  const { ttsEnabled } = useWebUI()

  return (
    <>
      <div className="relative flex w-full flex-col items-center pt-16 pb-4">
        {messages.length === 0 && <EmptySidePanel />}
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
            message_type={message.messageType}
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
            generationInfo={message?.generationInfo}
            isStreaming={streaming}
            reasoningTimeTaken={message?.reasoning_time_taken}
            modelImage={message?.modelImage}
            modelName={message?.modelName}
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
