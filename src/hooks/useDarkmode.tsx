import React from "react"
import { create } from "zustand"
import { useStorage } from "@plasmohq/storage/hook"

type DarkModeState = {
  mode: "dark" | "light"
  setMode: (mode: "dark" | "light") => void
}

type ThemePreference = "system" | "dark" | "light"

export const useDarkModeStore = create<DarkModeState>((set) => ({
  mode:
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  setMode: (mode) => set({ mode })
}))

/**
 * Theme handling with override
 * - preference: system | light | dark (persisted via storage)
 * - effective mode applied to <html> via `dark` class for Tailwind
 * - AntD algorithm consumers use returned `mode`
 */
export const useDarkMode = () => {
  const { mode, setMode } = useDarkModeStore()
  const [preference] = useStorage<ThemePreference>("themePreference", "system")

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")

    const computeEffective = (): "dark" | "light" => {
      if (preference === "system") return mq.matches ? "dark" : "light"
      return preference
    }

    const apply = () => {
      const effective = computeEffective()
      setMode(effective)
      const root = document.documentElement
      if (effective === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }

    apply()

    // Re-apply on system change only when following system
    const onChange = () => {
      if (preference === "system") apply()
    }

    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [setMode, preference])

  const toggleDarkMode = () => {
    // kept for backward compatibility; settings screen controls preference
  }

  return { mode, toggleDarkMode }
}
