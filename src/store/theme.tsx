import { create } from "zustand";
import { Theme } from "@/assets/colors";
import { BackgroundType } from "@/hooks/useTheme";
export const backgroundTypes: BackgroundType[] = ["plain", "blurryGradient", "layeredWaves", "blobScene"]

interface ThemeState {
  themeName: Theme;
  setTheme: (theme: Theme) => void;
  backgroundName: BackgroundType;
  setBackground: (background: BackgroundType) => void;
}

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem("themeName") as Theme | null;
  return saved && ["default", "moss", "commodore"].includes(saved) ? saved : "default";
};

const getInitialBackground = (): BackgroundType => {
  const saved = localStorage.getItem("backgroundName") as BackgroundType | null;
  return saved && backgroundTypes.includes(saved) ? saved : "plain";
};

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem("themeName", theme);
    set({ themeName: theme });
  },
  backgroundName: getInitialBackground(),
  setBackground: (background) => {
    localStorage.setItem("backgroundName", background);
    set({backgroundName: background})
  }
}));
