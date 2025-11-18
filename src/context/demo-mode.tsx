import React from "react"
import { useStorage } from "@plasmohq/storage/hook"

type DemoModeContextValue = {
  demoEnabled: boolean
  setDemoEnabled: (enabled: boolean) => void
}

const DemoModeContext = React.createContext<DemoModeContextValue | undefined>(
  undefined
)

export const DemoModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [demoEnabled, setDemoEnabled] = useStorage<boolean>(
    "demoModeEnabled",
    false
  )

  React.useEffect(() => {
    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent)?.detail
        const enabled =
          typeof detail?.enabled === "boolean" ? detail.enabled : true
        setDemoEnabled(enabled)
      } catch {
        setDemoEnabled(true)
      }
    }
    window.addEventListener("tldw:demo-mode-toggle", handler as EventListener)
    return () => {
      window.removeEventListener(
        "tldw:demo-mode-toggle",
        handler as EventListener
      )
    }
  }, [setDemoEnabled])

  const value = React.useMemo(
    () => ({
      demoEnabled,
      setDemoEnabled
    }),
    [demoEnabled, setDemoEnabled]
  )

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  )
}

export const useDemoMode = (): DemoModeContextValue => {
  const ctx = React.useContext(DemoModeContext)
  if (!ctx) {
    throw new Error("useDemoMode must be used within DemoModeProvider")
  }
  return ctx
}

