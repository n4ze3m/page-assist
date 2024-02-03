import React from "react";
import { create } from "zustand";

type DarkModeState = {
  mode: "system" | "dark" | "light";
  setMode: (mode: "system" | "dark" | "light") => void;
};

export const useDarkModeStore = create<DarkModeState>((set) => ({
  mode: "system",
  setMode: (mode) => set({ mode }),
}));

export const useDarkMode = () => {
  const { mode, setMode } = useDarkModeStore();

  const getSystemTheme = () => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    const isDarkMode = darkModeMediaQuery.matches;
    return isDarkMode ? "dark" : "light";
  };

  const handleDarkModeChange = (e: MediaQueryListEvent) => {
    document.documentElement.classList.remove("dark", "light");
    const mode = e.matches ? "dark" : "light";
    document.documentElement.classList.add(mode);
    setMode(mode);
  };

  React.useEffect(() => {
    const theme = localStorage.getItem("theme") as "system" | "dark" | "light";
    if (theme) {
      if (theme !== "system") {
        document.documentElement.classList.add(theme);
        setMode(theme);
      } else {
        const systemTheme = getSystemTheme();
        document.documentElement.classList.add(systemTheme);
        setMode(systemTheme);
      }
    } else {
      setMode(getSystemTheme());
      localStorage.setItem("theme", getSystemTheme());
    }
  }, []);

  React.useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    darkModeMediaQuery.addEventListener("change", handleDarkModeChange);
    return () =>
      darkModeMediaQuery.removeEventListener("change", handleDarkModeChange);
  }, []);

  const toggleDarkMode = () => {
    const newMode = mode === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newMode);
    setMode(newMode);
    localStorage.setItem("theme", newMode);
  };

  return { mode, toggleDarkMode };
};