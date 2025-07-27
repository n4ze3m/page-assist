/*
* This is old code i just wanted to keep for reference.
*/

import { useRef, useEffect, useState, useCallback } from "react"

export const useSmartScroll = (messages: any[], streaming: boolean, threshold: number = 50) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const lastMessageCount = useRef(0)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return false
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    return scrollHeight - scrollTop - clientHeight <= threshold
  }, [threshold])

  const updateScrollStates = useCallback(() => {
    const atBottom = checkIfAtBottom()
    setIsAtBottom(atBottom)
    
    if (atBottom) {
      setShouldAutoScroll(true)
    }
  }, [checkIfAtBottom])

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (!containerRef.current) return
    
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    })
  }, [])

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }

      // Debounce scroll events
      scrollTimeout.current = setTimeout(() => {
        const atBottom = checkIfAtBottom()
        setIsAtBottom(atBottom)
        
        if (atBottom) {
          setShouldAutoScroll(true)
        } else {
          // Only disable auto-scroll if user actively scrolled up
          setShouldAutoScroll(false)
        }
      }, 100)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    
    // Initial check
    updateScrollStates()

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [checkIfAtBottom, updateScrollStates])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current
    lastMessageCount.current = messages.length

    if (messages.length === 0) {
      setShouldAutoScroll(true)
      setIsAtBottom(true)
      return
    }

    if (shouldAutoScroll && hasNewMessages) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom(false)
        // Update states after scroll
        setTimeout(() => {
          updateScrollStates()
        }, 50)
      }, 0)
    } else {
      // Still update states even if not auto-scrolling
      setTimeout(updateScrollStates, 50)
    }
  }, [messages, shouldAutoScroll, scrollToBottom, updateScrollStates])

  // Enable auto-scroll when streaming starts if at bottom
  useEffect(() => {
    if (streaming && isAtBottom) {
      setShouldAutoScroll(true)
    }
  }, [streaming, isAtBottom])

  const autoScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true)
    setIsAtBottom(true)
    scrollToBottom(true)
  }, [scrollToBottom])

  return { 
    containerRef, 
    isAutoScrollToBottom: isAtBottom && shouldAutoScroll, 
    autoScrollToBottom 
  }
}