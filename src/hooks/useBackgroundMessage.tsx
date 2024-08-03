import { useState, useEffect } from "react"

interface Message {
  from: string
  type: string
  text: string
}

function useBackgroundMessage() {
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    const messageListener = (request: Message) => {
      if (request.from === "background") {
        setMessage(request)
      }
    }
    browser.runtime.connect({ name: 'pgCopilot' })
    browser.runtime.onMessage.addListener(messageListener)

    return () => {
      browser.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  return message
}

export default useBackgroundMessage