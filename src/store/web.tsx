import { create } from "zustand"

type State = {
  state: "searching" | "clicked" | "embeddings" | "done"
  text: string
  setText: (text: string) => void
  setState: (state: "searching" | "clicked" | "embeddings" | "done") => void
}

export const useWebSearch = create<State>((set) => ({
  state: "searching",
  text: "Searching Google",
  setText: (text) => set({ text }),
  setState: (state) => set({ state })
}))
