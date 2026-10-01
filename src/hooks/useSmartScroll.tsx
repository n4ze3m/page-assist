import { useRef, useEffect, useState, useCallback } from "react"

export const useSmartScroll = (
  messages: any[],
  streaming: boolean,
  threshold: number = 100,
  resetKey?: string | null
) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScrollTop = useRef(0)
  const lastScrollHeight = useRef(0)
  const isScrollingProgrammatically = useRef(false)
  const previousResetKey = useRef<string | null | undefined>(resetKey)
  const pendingResetScroll = useRef(false)
  // True while the primary mouse button is held down inside the container,
  // i.e. the user is (probably) drag-selecting text. Auto-scroll is paused
  // during that time so the content doesn't move under the cursor.
  const isPointerDown = useRef(false)
  // Synchronous mirror of `isAutoScrollEnabled`, so a scroll that was queued
  // (requestAnimationFrame) before the user scrolled up can bail out instead
  // of snapping the view back to the bottom.
  const autoScrollEnabledRef = useRef(true)

  const setAutoScrollEnabled = useCallback((enabled: boolean) => {
    autoScrollEnabledRef.current = enabled
    setIsAutoScrollEnabled(enabled)
  }, [])

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

    lastScrollTop.current = container.scrollTop
    lastScrollHeight.current = container.scrollHeight

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
      const { scrollTop, scrollHeight } = container
      const isScrollingUp = scrollTop < lastScrollTop.current

      // Programmatic scrolls only ever move towards the bottom, and
      // `lastScrollTop` is updated right after each one, so a decrease is
      // always the user (scrollbar drag, keyboard, touch) — honour it even
      // while a programmatic scroll is in flight.
      if (isScrollingProgrammatically.current && !isScrollingUp) return

      lastScrollTop.current = scrollTop
      lastScrollHeight.current = scrollHeight

      if (isScrollingUp) {
        setAutoScrollEnabled(false)
      }

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }

      scrollTimeout.current = setTimeout(() => {
        if (isAtBottom()) {
          setAutoScrollEnabled(true)
        }
      }, 300)
    }

    // Explicit user intent: scrolling up with the wheel/trackpad always
    // disables auto-scroll, even if a programmatic scroll is in flight.
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        setAutoScrollEnabled(false)
      }
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (event.button === 0) {
        isPointerDown.current = true
      }
    }

    const handlePointerUp = () => {
      isPointerDown.current = false
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    container.addEventListener("wheel", handleWheel, { passive: true })
    container.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("mouseup", handlePointerUp)

    return () => {
      container.removeEventListener("scroll", handleScroll)
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("mouseup", handlePointerUp)
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [isAtBottom])

  useEffect(() => {
    if (streaming && isAutoScrollEnabled) {
      requestAnimationFrame(() => {
        if (!autoScrollEnabledRef.current || isPointerDown.current) return
        scrollToBottom(false)
      })
    }
  }, [streaming, isAutoScrollEnabled, scrollToBottom])

  useEffect(() => {
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey
      pendingResetScroll.current = true
      setAutoScrollEnabled(true)
    }
  }, [resetKey])

  useEffect(() => {
    if (!pendingResetScroll.current || messages.length === 0) {
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom(false)
        pendingResetScroll.current = false
      })
    })
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (messages.length === 0) {
      setAutoScrollEnabled(true)
      return
    }

    if (!isAutoScrollEnabled || isPointerDown.current) {
      return
    }

    // While streaming, follow every chunk. Only scrolling once the bottom is
    // more than `threshold` px away makes the view snap down in steps of
    // threshold+1 line, which reads as the message "jumping" as it streams.
    if (streaming || !isAtBottom()) {
      requestAnimationFrame(() => {
        // The user may have scrolled up / started selecting in the meantime.
        if (!autoScrollEnabledRef.current || isPointerDown.current) return
        scrollToBottom(!streaming)
      })
    }
  }, [messages, isAutoScrollEnabled, scrollToBottom, streaming, isAtBottom])

  const autoScrollToBottom = useCallback(() => {
    setAutoScrollEnabled(true)
    scrollToBottom(true)
  }, [scrollToBottom])

  return {
    containerRef,
    isAutoScrollToBottom: isAutoScrollEnabled && isAtBottom(),
    autoScrollToBottom
  }
}