import { create } from "zustand";
import { Theme } from "@/assets/colors";

interface ThemeState {
  themeName: Theme;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem("themeName") as Theme | null;
  return saved && ["default", "moss", "commodore"].includes(saved) ? saved : "default";
};

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem("themeName", theme);
    set({ themeName: theme });
  },
}));
