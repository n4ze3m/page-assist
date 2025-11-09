import React from "react"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { useMessage } from "~/hooks/useMessage"
import { EmptySidePanel } from "../Chat/empty"
import { useWebUI } from "@/store/webui"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"
import { useVirtualizer } from "@tanstack/react-virtual"

type Props = { scrollParentRef?: React.RefObject<HTMLDivElement> }

export const SidePanelBody = ({ scrollParentRef }: Props) => {
  const {
    messages,
    streaming,
    isProcessing,
    regenerateLastMessage,
    editMessage,
    isSearchingInternet, 
    createChatBranch,
    temporaryChat,
    stopStreamingRequest
  } = useMessage()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  const { ttsEnabled } = useWebUI()

  const parentEl = scrollParentRef?.current || null
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentEl,
    estimateSize: () => 120,
    overscan: 6,
    measureElement: (el) => el?.getBoundingClientRect().height || 120
  })

  return (
    <>
      <div className="relative flex w-full flex-col items-center pt-16 pb-4">
        {messages.length === 0 && <EmptySidePanel />}
        <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const index = vr.index
            const message = messages[index]
            return (
              <div key={vr.key} ref={rowVirtualizer.measureElement} data-index={index} style={{ position: 'absolute', top: 0, left: 0, transform: `translateY(${vr.start}px)`, width: '100%' }}>
                <PlaygroundMessage
                  isBot={message.isBot}
                  message={message.message}
                  name={message.name}
                  images={message.images || []}
                  currentMessageIndex={index}
                  totalMessages={messages.length}
                  onRengerate={regenerateLastMessage}
                  message_type={message.messageType}
                  isProcessing={isProcessing}
                  isSearchingInternet={isSearchingInternet}
                  sources={message.sources}
                  onEditFormSubmit={(value) => { editMessage(index, value, !message.isBot) }}
                  onNewBranch={() => { createChatBranch(index) }}
                  onSourceClick={(data) => { setSource(data); setIsSourceOpen(true) }}
                  isTTSEnabled={ttsEnabled}
                  generationInfo={message?.generationInfo}
                  isStreaming={streaming}
                  reasoningTimeTaken={message?.reasoning_time_taken}
                  modelImage={message?.modelImage}
                  modelName={message?.modelName}
                  temporaryChat={temporaryChat}
                  onStopStreaming={stopStreamingRequest}
                />
              </div>
            )
          })}
        </div>
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
