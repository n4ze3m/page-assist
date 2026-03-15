import React from "react"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { useMessage } from "~/hooks/useMessage"
import { EmptySidePanel } from "../Chat/empty"
import { useWebUI } from "@/store/webui"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"
import { usePlaygroundMessageGroups } from "@/components/Common/Playground/message-groups"

const SidePanelBodyComponent = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    editMessage,
    isSearchingInternet, 
    createChatBranch,
    temporaryChat,
    actionInfo
  } = useMessage()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  const { ttsEnabled } = useWebUI()
  const messageGroups = usePlaygroundMessageGroups(messages)
  const lastGroupIndex = messageGroups.length - 1

  const handleEditMessage = React.useCallback(
    (
      actionIndex: number,
      isHuman: boolean,
      value: string,
      _isSend: boolean
    ) => {
      editMessage(actionIndex, value, isHuman)
    },
    [editMessage]
  )

  const handleSourceClick = React.useCallback((data: any) => {
    setSource(data)
    setIsSourceOpen(true)
  }, [])

  return (
    <>
      <div className="relative flex w-full flex-col items-center pt-16 pb-4">
        {messages.length === 0 && <EmptySidePanel />}
        {messageGroups.map((message, index) => (
          <PlaygroundMessage
            key={message.renderKey}
            isBot={message.isBot}
            message={message.message}
            name={message.name}
            images={message.images || []}
            isLastMessage={index === lastGroupIndex}
            actionIndex={message.actionIndex}
            onRengerate={
              index === lastGroupIndex ? regenerateLastMessage : undefined
            }
            message_type={message.messageType}
            isProcessing={streaming && index === lastGroupIndex}
            isSearchingInternet={
              index === lastGroupIndex ? isSearchingInternet : false
            }
            sources={message.sources}
            onEditFormSubmit={handleEditMessage}
            onNewBranch={createChatBranch}
            onSourceClick={handleSourceClick}
            isTTSEnabled={ttsEnabled}
            generationInfo={message?.generationInfo}
            isStreaming={streaming && index === lastGroupIndex}
            reasoningTimeTaken={message?.reasoning_time_taken}
            modelImage={message?.modelImage}
            modelName={message?.modelName}
            temporaryChat={temporaryChat}
            actionInfo={index === lastGroupIndex ? actionInfo : null}
            messageKind={message?.messageKind}
            toolCalls={message?.toolCalls}
            toolCallId={message?.toolCallId}
            toolName={message?.toolName}
            toolServerName={message?.toolServerName}
            toolError={message?.toolError}
            segments={message.segments}
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

export const SidePanelBody = React.memo(SidePanelBodyComponent)
