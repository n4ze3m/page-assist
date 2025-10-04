import { useEffect, useState } from "react"
import { themes, Theme } from "@/assets/colors"

export function useTheme(defaultTheme: Theme = "sky") {
  const [themeName, setThemeName] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const themeObj = themes[themeName??"sky"];
    Object.entries(themeObj.primary).forEach(([key, hex]) => {
      const rgb = hexToRgb(hex)
      document.documentElement.style.setProperty(`--primary-${key}`, rgb)
    })
  }, [themeName])

  return { themeName, setTheme: setThemeName }
}

// Utility: Convert hex to R, G, B (no alpha)
function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "")
  const bigint = parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `${r} ${g} ${b}`
}
