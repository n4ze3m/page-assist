import { useCallback, useEffect, useRef, useState } from "react"

export const useScrollAnchor = () => {
  const messagesRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibilityRef = useRef<HTMLDivElement>(null)

  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollIntoView({
        block: "end",
        behavior: "smooth"
      })
    }
  }, [])

  useEffect(() => {
    if (messagesRef.current) {
      if (isAtBottom && !isVisible) {
        messagesRef.current.scrollIntoView({
          block: "end"
        })
      }
    }
  }, [isAtBottom, isVisible])

  useEffect(() => {
    const { current } = scrollRef

    if (current) {
      const handleScroll = (event: Event) => {
        const target = event.target as HTMLDivElement
        const offset = 25
        const isAtBottom =
          target.scrollTop + target.clientHeight >= target.scrollHeight - offset
        console.log(target.scrollTop, target.clientHeight, target.scrollHeight)
        setIsAtBottom(isAtBottom)
      }

      current.addEventListener("scroll", handleScroll, {
        passive: true
      })

      return () => {
        current.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    if (visibilityRef.current) {
      let observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            console.log(entry.isIntersecting)
            if (entry.isIntersecting) {
              setIsVisible(true)
            } else {
              setIsVisible(false)
            }
          })
        },
        {
          rootMargin: "0px 0px -100px 0px"
        }
      )

      observer.observe(visibilityRef.current)

      return () => {
        observer.disconnect()
      }
    }
  })

  return {
    messagesRef,
    scrollRef,
    visibilityRef,
    scrollToBottom,
    isAtBottom,
    isVisible
  }
}
