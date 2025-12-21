import React from "react";
import { create } from "zustand";

type DarkModeState = {
  mode: "dark" | "light";
  setMode: (mode: "dark" | "light") => void;
};

export const useDarkModeStore = create<DarkModeState>((set) => ({
  mode:
    typeof window !== "undefined" &&
    // prefer 'dark' if the system is currently dark
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  setMode: (mode) => set({ mode })
}));

/**
 * System-driven theme:
 * - Follows browser/OS prefers-color-scheme
 * - No DOM class mutations, no localStorage overrides
 * - toggleDarkMode is a no-op to retain API compatibility
 */
export const useDarkMode = () => {
  const { mode, setMode } = useDarkModeStore();

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setMode(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [setMode]);

  const toggleDarkMode = () => {
    // no-op: theming follows system preference
  };

  return { mode, toggleDarkMode };
};
