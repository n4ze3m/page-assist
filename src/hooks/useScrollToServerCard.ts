import React from "react"
import { useNavigate } from "react-router-dom"
import { setReturnTo, type ReturnToTarget } from "@/utils/return-to"

export const useScrollToServerCard = (
  returnTo?: ReturnToTarget | null
): (() => void) => {
  const navigate = useNavigate()

  return React.useCallback(() => {
    if (returnTo) {
      setReturnTo(returnTo)
    }
    try {
      const el = document.getElementById("server-connection-card")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        ;(el as HTMLElement).focus?.()
        return
      }
    } catch {
      // ignore and fall through
    }
    navigate("/settings/tldw")
  }, [navigate, returnTo])
}
