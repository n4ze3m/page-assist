import { useRef, useEffect, useState } from "react"

export const useSmartScroll = (messages: any[], streaming: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (messages.length === 0) {
      setIsAtBottom(true)
      return
    }

    if (isAtBottom && containerRef.current) {
      const scrollOptions: ScrollIntoViewOptions = streaming
        ? { behavior: "smooth", block: "end" }
        : { behavior: "auto", block: "end" }
      containerRef.current.lastElementChild?.scrollIntoView(scrollOptions)
    }
  }, [messages, streaming, isAtBottom])

  const scrollToBottom = () => {
    containerRef.current?.lastElementChild?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    })
  }

  return { containerRef, isAtBottom, scrollToBottom }
}