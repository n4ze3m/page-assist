import React from "react"
import { PlaygroundMessage } from "@/components/Common/Playground/Message"
import { useMessage } from "@/hooks/useMessage"
import { EmptySidePanel } from "../Chat/empty"
import { useWebUI } from "@/store/webui"
import { MessageSourcePopup } from "@/components/Common/Playground/MessageSourcePopup"

const formatDateLabel = (ts: number) => {
  const now = new Date()
  const today = new Date(now.setHours(0, 0, 0, 0))
  const d = new Date(ts)
  const isToday = d >= today
  const yday = new Date(today)
  yday.setDate(yday.getDate() - 1)
  const isYesterday = d >= yday && d < today
  if (isToday) return "today"
  if (isYesterday) return "yesterday"
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  if (d >= lastWeek) return "last7Days"
  return "older"
}

export const SidePanelBody = () => {
  const {
    messages,
    streaming,
    regenerateLastMessage,
    editMessage,
    isSearchingInternet,
    createChatBranch,
    temporaryChat
  } = useMessage()
  const [isSourceOpen, setIsSourceOpen] = React.useState(false)
  const [source, setSource] = React.useState<any>(null)
  const { ttsEnabled } = useWebUI()

  const groups = React.useMemo(() => {
    if (messages.length === 0)
      return [] as Array<{ label: string; items: number[] }>
    const hasTs = messages.some(
      (m: any) =>
        typeof m?.createdAt === "number" || m?.generationInfo?.createdAt
    )
    if (!hasTs) return [{ label: "today", items: messages.map((_, i) => i) }]
    const map: Record<string, number[]> = {}
    messages.forEach((m: any, i) => {
      const ts =
        typeof m?.createdAt === "number"
          ? m.createdAt
          : typeof m?.generationInfo?.createdAt === "number"
            ? m.generationInfo.createdAt
            : Date.now()
      const label = formatDateLabel(ts)
      if (!map[label]) map[label] = []
      map[label].push(i)
    })
    const order = ["today", "yesterday", "last7Days", "older"]
    return order
      .filter((k) => map[k]?.length)
      .map((k) => ({ label: k, items: map[k] }))
  }, [messages])

  return (
    <>
      <div className="relative flex w-full flex-col items-center pt-16 pb-4">
        {messages.length === 0 && <EmptySidePanel />}
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="w-full">
            <div className="w-full px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              {group.label}
            </div>
            {group.items.map((index) => {
              const message = messages[index]
              if (!message) {
                return null
              }
              return (
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
                  onNewBranch={() => {
                    createChatBranch(index)
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
                  temporaryChat={temporaryChat}
                  uiStreaming={message?.uiStreaming}
                />
              )
            })}
          </div>
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
