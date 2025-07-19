import { useRef, useEffect, useState, useCallback } from "react"

export const useSmartScroll = (messages: any[], streaming: boolean, threshold: number = 50) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const lastMessageCount = useRef(0)
  const isUserScrolling = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return false
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    return scrollHeight - scrollTop - clientHeight <= threshold
  }, [threshold])

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScrollStart = () => {
      isUserScrolling.current = true
    }

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrolling.current = false
        
        if (isAtBottom()) {
          setShouldAutoScroll(true)
        } else {
          setShouldAutoScroll(false)
        }
      }, 150)
    }

    // Listen for user interactions
    container.addEventListener("mousedown", handleScrollStart, { passive: true })
    container.addEventListener("touchstart", handleScrollStart, { passive: true })
    container.addEventListener("wheel", handleScrollStart, { passive: true })
    container.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      container.removeEventListener("mousedown", handleScrollStart)
      container.removeEventListener("touchstart", handleScrollStart)
      container.removeEventListener("wheel", handleScrollStart)
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isAtBottom])

  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current
    lastMessageCount.current = messages.length

    if (messages.length === 0) {
      setShouldAutoScroll(true)
      return
    }

    if (shouldAutoScroll && hasNewMessages && !isUserScrolling.current) {
      // Double RAF to ensure DOM updates are complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(false)
        })
      })
    }
  }, [messages, shouldAutoScroll, scrollToBottom])

  useEffect(() => {
    if (streaming && isAtBottom()) {
      setShouldAutoScroll(true)
    }
  }, [streaming, isAtBottom])

  const autoScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true)
    scrollToBottom(true)
  }, [scrollToBottom])

  return { 
    containerRef, 
    isAutoScrollToBottom: shouldAutoScroll, 
    autoScrollToBottom 
  }
}
