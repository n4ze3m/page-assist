import { useCallback, useEffect, useRef, useState } from "react"
import { useMessageOption } from "./useMessageOption"

export const useScrollAnchor = () => {
  const { isProcessing, messages } = useMessageOption()

  const [isAtTop, setIsAtTop] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const messagesStartRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(false)

  console.log(`isAtTop: ${isAtTop}, isAtBottom: ${isAtBottom}, userScrolled: ${userScrolled}, isOverflowing: ${isOverflowing}`)

  useEffect(() => {
    if (!isProcessing && userScrolled) {
      console.log("userScrolled")
      setUserScrolled(false)
    }
  }, [isProcessing])

  useEffect(() => {
    if (isProcessing && !userScrolled) {
      scrollToBottom()
    }
  }, [messages])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const topObserver = new IntersectionObserver(
      ([entry]) => {
        setIsAtTop(entry.isIntersecting)
      },
      { threshold: 1 }
    )

    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting)
        if (entry.isIntersecting) {
          setUserScrolled(false)
        } else if (!isAutoScrolling.current) {
          setUserScrolled(true)
        }
      },
      { threshold: 1 }
    )

    if (messagesStartRef.current) {
      topObserver.observe(messagesStartRef.current)
    }

    if (messagesEndRef.current) {
      bottomObserver.observe(messagesEndRef.current)
    }

    const resizeObserver = new ResizeObserver(() => {
      setIsOverflowing(container.scrollHeight > container.clientHeight)
    })

    resizeObserver.observe(container)

    return () => {
      topObserver.disconnect()
      bottomObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [])

  const scrollToTop = useCallback(() => {
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    isAutoScrolling.current = true

    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      }

      isAutoScrolling.current = false
    }, 100)
  }, [])

  return {
    messagesStartRef,
    messagesEndRef,
    containerRef,
    isAtTop,
    isAtBottom,
    userScrolled,
    isOverflowing,
    scrollToTop,
    scrollToBottom,
    setIsAtBottom
  }
}