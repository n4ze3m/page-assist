import { useEffect, useRef } from "react"
import { ConnectionPhase } from "@/types/connection"

export const focusComposer = () => {
  try {
    window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
  } catch {
    // ignore
  }
}

export const useFocusComposerOnConnect = (
  phase: ConnectionPhase | null | undefined
) => {
  const previousPhaseRef = useRef<ConnectionPhase | null>(null)

  useEffect(() => {
    if (phase == null) return
    if (
      previousPhaseRef.current !== ConnectionPhase.CONNECTED &&
      phase === ConnectionPhase.CONNECTED
    ) {
      setTimeout(() => {
        focusComposer()
      }, 0)
    }
    previousPhaseRef.current = phase
  }, [phase])
}

