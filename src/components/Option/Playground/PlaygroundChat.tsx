import React from "react"
import { useMessageOption } from "~/hooks/useMessageOption"
import { PlaygroundEmpty } from "./PlaygroundEmpty"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"
import { useStorage } from "@plasmohq/storage/hook"
import { usePlaygroundMessageGroups } from "@/components/Common/Playground/message-groups"

const PlaygroundChatComponent = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    isSearchingInternet,
    editMessage,
    ttsEnabled,
    onSubmit,
    actionInfo,
    createChatBranch,
    temporaryChat
  } = useMessageOption()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  const [openReasoning] = useStorage("openReasoning", false)
  const messageGroups = usePlaygroundMessageGroups(messages)
  const lastGroupIndex = messageGroups.length - 1

  const handleEditMessage = React.useCallback(
    (
      actionIndex: number,
      isHuman: boolean,
      value: string,
      isSend: boolean
    ) => {
      editMessage(actionIndex, value, isHuman, isSend)
    },
    [editMessage]
  )

  const handleSourceClick = React.useCallback((data: any) => {
    setSource(data)
    setIsSourceOpen(true)
  }, [])

  const handleContinue = React.useCallback(() => {
    onSubmit({
      image: "",
      message: "",
      isContinue: true
    })
  }, [onSubmit])

  return (
    <>
      <div className="relative flex w-full flex-col items-center pt-16 pb-4">
        {messages.length === 0 && (
          <div className="mt-32 w-full">
            <PlaygroundEmpty />
          </div>
        )}
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
            isProcessing={streaming && index === lastGroupIndex}
            isSearchingInternet={
              index === lastGroupIndex ? isSearchingInternet : false
            }
            sources={message.sources}
            onEditFormSubmit={handleEditMessage}
            onSourceClick={handleSourceClick}
            onNewBranch={createChatBranch}
            isTTSEnabled={ttsEnabled}
            generationInfo={message?.generationInfo}
            isStreaming={streaming && index === lastGroupIndex}
            reasoningTimeTaken={message?.reasoning_time_taken}
            openReasoning={openReasoning}
            modelImage={message?.modelImage}
            modelName={message?.modelName}
            temporaryChat={temporaryChat}  
            messageKind={message?.messageKind}
            toolCalls={message?.toolCalls}
            toolCallId={message?.toolCallId}
            toolName={message?.toolName}
            toolServerName={message?.toolServerName}
            toolError={message?.toolError}
            segments={message.segments}
            onContinue={index === lastGroupIndex ? handleContinue : undefined}
            documents={message?.documents}
            actionInfo={index === lastGroupIndex ? actionInfo : null}
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

export const PlaygroundChat = React.memo(PlaygroundChatComponent)
