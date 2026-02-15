import React from "react"

export type QueuedMessage = {
  id: string
  message: string
  images: string[]
}

const createQueueId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useMessageQueue = ({
  enabled,
  streaming,
  onSendMessage,
  onStopStreaming
}: {
  enabled: boolean
  streaming: boolean
  onSendMessage: (payload: { message: string; images: string[] }) => Promise<void>
  onStopStreaming: () => void
}) => {
  const [queuedMessages, setQueuedMessages] = React.useState<QueuedMessage[]>([

  ])
  const isDispatchingRef = React.useRef(false)
  const queueRef = React.useRef<QueuedMessage[]>([])
  const priorityMessageIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    queueRef.current = queuedMessages
  }, [queuedMessages])

  React.useEffect(() => {
    if (!enabled) {
      setQueuedMessages([])
      priorityMessageIdRef.current = null
    }
  }, [enabled])

  const flushNextMessage = React.useCallback(async () => {

    if (!enabled || streaming || isDispatchingRef.current) {
      return
    }

    const queue = queueRef.current
    if (queue.length === 0) {
      return
    }

    const priorityId = priorityMessageIdRef.current
    let next = queue[0]

    if (priorityId) {
      const priorityMessage = queue.find((item) => item.id === priorityId)
      if (priorityMessage) {
        next = priorityMessage
      }
      priorityMessageIdRef.current = null
    }

    isDispatchingRef.current = true
    setQueuedMessages((prev) => prev.filter((item) => item.id !== next.id))

    try {
      await onSendMessage({
        message: next.message,
        images: next.images
      })
    } catch (error) {
      setQueuedMessages((prev) => [next, ...prev])
      console.error("Failed to send queued message", error)
    } finally {
      isDispatchingRef.current = false
    }
  }, [enabled, onSendMessage, streaming])

  React.useEffect(() => {
    if (!enabled || streaming || queuedMessages.length === 0) {
      return
    }
    void flushNextMessage()
  }, [enabled, flushNextMessage, queuedMessages.length, streaming])

  const enqueueMessage = React.useCallback(
    ({ message, images = [] }: { message: string; images?: string[] }) => {
      if (!enabled) {
        return false
      }

      const trimmedMessage = message.trim()
      const hasImages = images.length > 0
      if (!trimmedMessage && !hasImages) {
        return false
      }

      setQueuedMessages((prev) => {
        return [
          ...prev,
          {
            id: createQueueId(),
            message: trimmedMessage,
            images
          }
        ]
      })

      return true
    },
    [enabled, streaming]
  )

  const deleteQueuedMessage = React.useCallback((id: string) => {
    setQueuedMessages((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateQueuedMessage = React.useCallback(
    (
      id: string,
      payload: {
        message: string
        images?: string[]
      }
    ) => {
      const trimmedMessage = payload.message.trim()
      const nextImages = payload.images || []
      const hasImages = nextImages.length > 0

      setQueuedMessages((prev) => {
        if (!trimmedMessage && !hasImages) {
          return prev.filter((item) => item.id !== id)
        }

        return prev.map((item) =>
          item.id === id
            ? {
              ...item,
              message: trimmedMessage,
              images: nextImages
            }
            : item
        )
      })
    },
    []
  )

  const takeQueuedMessage = React.useCallback((id: string) => {
    let queuedMessage: QueuedMessage | null = null
    setQueuedMessages((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) {
        queuedMessage = target
      }
      return prev.filter((item) => item.id !== id)
    })
    return queuedMessage
  }, [])

  const sendQueuedMessageNow = React.useCallback(
    (id: string) => {
      if (!queueRef.current.find((item) => item.id === id)) {
        return
      }

      priorityMessageIdRef.current = id

      if (streaming) {
        onStopStreaming()
        return
      }

      void flushNextMessage()
    },
    [flushNextMessage, onStopStreaming, streaming]
  )

  return {
    queuedMessages,
    enqueueMessage,
    deleteQueuedMessage,
    updateQueuedMessage,
    takeQueuedMessage,
    sendQueuedMessageNow
  }
}
