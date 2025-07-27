import { useRef, useEffect, useState, useCallback, useMemo } from "react"

export const useSmartScroll = (
  messages: any[],
  streaming: boolean,
  threshold: number = 100 
) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTop = useRef(0)
  const lastScrollHeight = useRef(0)
  const isScrollingProgrammatically = useRef(false)

  const isAtBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight <= threshold
  }, [threshold])

  const scrollToBottom = useCallback((smooth: boolean = false) => {
    const container = containerRef.current
    if (!container) return

    isScrollingProgrammatically.current = true

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    })

    setTimeout(
      () => {
        isScrollingProgrammatically.current = false
      },
      smooth ? 300 : 50
    )
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return

      const { scrollTop, scrollHeight } = container
      const isScrollingUp = scrollTop < lastScrollTop.current

      lastScrollTop.current = scrollTop
      lastScrollHeight.current = scrollHeight

      if (isScrollingUp) {
        setIsAutoScrollEnabled(false)
      }

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }

      scrollTimeout.current = setTimeout(() => {
        if (isAtBottom()) {
          setIsAutoScrollEnabled(true)
        }
      }, 300)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [isAtBottom])

  useEffect(() => {
    if (streaming && isAutoScrollEnabled) {
      requestAnimationFrame(() => {
        scrollToBottom(false)
      })
    }
  }, [streaming, isAutoScrollEnabled, scrollToBottom])

  useEffect(() => {
    if (messages.length === 0) {
      setIsAutoScrollEnabled(true)
      return
    }

    if (isAutoScrollEnabled && !isAtBottom()) {
      requestAnimationFrame(() => {
        scrollToBottom(!streaming)
      })
    }
  }, [messages, isAutoScrollEnabled, scrollToBottom, streaming, isAtBottom])

  const autoScrollToBottom = useCallback(() => {
    setIsAutoScrollEnabled(true)
    scrollToBottom(true)
  }, [scrollToBottom])

  return {
    containerRef,
    isAutoScrollToBottom: isAutoScrollEnabled && isAtBottom(),
    autoScrollToBottom
  }
}
