import React from "react"
import { List } from "lucide-react"
import { PlaygroundMessage } from "~/components/Common/Playground/Message"
import { MessageOutline } from "@/components/Common/Playground/MessageOutline"
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

  const [outlineOpen, setOutlineOpen] = React.useState(false)

const handleOutlineSelect = React.useCallback((renderKey: string) => {
  const element = document.getElementById(`msg-${renderKey}`)

  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })

    setOutlineOpen(false)
  }
}, [])
React.useEffect(() => {
  const handleToggleOutline = () => {
    setOutlineOpen((open) => !open)
  }

  window.addEventListener("toggle-message-outline", handleToggleOutline)

  return () => {
    window.removeEventListener(
      "toggle-message-outline",
      handleToggleOutline
    )
  }
}, [])
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
      {messageGroups.some((group) => !group.isBot) && (
  <button
    type="button"
    onClick={() => setOutlineOpen((open) => !open)}
    className="absolute right-3 top-16 z-30 rounded-md border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-[#1a1a1a]"
    title="Message outline">
    <List className="size-4 text-gray-500 dark:text-gray-400" />
  </button>
)}

{outlineOpen && (
  <MessageOutline
    messageGroups={messageGroups}
    onSelectMessage={handleOutlineSelect}
  />
)}
<button
  type="button"
  onClick={() => setOutlineOpen((open) => !open)}
  className="absolute right-3 top-16 z-30 rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
  title="Message outline"
>
  <List className="size-4" />
</button>

{outlineOpen && (
  <MessageOutline
    messageGroups={messageGroups}
    onSelectMessage={handleOutlineSelect}
  />
)}

        {messages.length === 0 && <EmptySidePanel />}
        {messageGroups.map((message, index) => (
          <PlaygroundMessage
            key={message.renderKey}
            messageId={`msg-${message.renderKey}`}
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
            createdAt={message?.createdAt}
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
