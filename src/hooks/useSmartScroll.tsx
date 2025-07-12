import { useRef, useEffect, useState } from "react"

export const useSmartScroll = (messages: any[], streaming: boolean, threshold: number = 50) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollToBottom, setIsAutoScrollToBottom] = useState(true)
  const cooldownTimer = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTop = useRef(0)
  const lastScrollHeight = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const atBottom = scrollHeight - scrollTop - clientHeight < threshold
      const isOverflow = scrollHeight > clientHeight
      const isScrollingUp = scrollTop < lastScrollTop.current
      // Prevent misjudging a sudden reduction in scrollHeight (e.g., during the creation of diagrams or charts) as an upward scroll
      const isHeightReduced = scrollHeight < lastScrollHeight.current
      lastScrollTop.current = scrollTop
      lastScrollHeight.current = scrollHeight

      if (isAutoScrollToBottom && isOverflow && !isHeightReduced && isScrollingUp) {
        // User is scrolling up while auto-scroll is enabled; temporarily disable auto-scroll (with a short cooldown)
        if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
        cooldownTimer.current = setTimeout(() => {
          cooldownTimer.current = null
        }, 300)

        setIsAutoScrollToBottom(false)
      } else if (atBottom && !cooldownTimer.current) {
        setIsAutoScrollToBottom(true)
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    }
  }, [])

  useEffect(() => {
    if (streaming) {
      setIsAutoScrollToBottom(true)
    }
  }, [streaming]) // Enable auto-scroll when LLM is replying (streaming)

  useEffect(() => {
    if (messages.length === 0) {
      setIsAutoScrollToBottom(true)
      lastScrollTop.current = 0
      return
    }

    if (isAutoScrollToBottom) {
      scrollToBottom(streaming)
    }
  }, [messages]) // Only auto-scroll on messages change

  const scrollToBottom = (smooth: boolean) => {
    if (containerRef.current) {
      const scrollOptions: ScrollIntoViewOptions = smooth
        ? { behavior: "smooth", block: "end" }
        : { behavior: "auto", block: "end" }
      containerRef.current.lastElementChild?.scrollIntoView(scrollOptions)
    }
  }

  const autoScrollToBottom = (smooth: boolean = true) => {
    scrollToBottom(smooth)
    setIsAutoScrollToBottom(true)
  }

  return { containerRef, isAutoScrollToBottom, autoScrollToBottom }
}
