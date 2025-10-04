import { create } from "zustand"
import { Theme } from "@/assets/colors"

interface ThemeState {
  themeName: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: "sky",
  setTheme: (theme) => set({ themeName: theme })
}))
