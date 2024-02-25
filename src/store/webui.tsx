import { create } from "zustand"

type State = {
  sendWhenEnter: boolean
  setSendWhenEnter: (sendWhenEnter: boolean) => void
}

export const useWebUI = create<State>((set) => ({
  sendWhenEnter: true,
  setSendWhenEnter: (sendWhenEnter) => set({ sendWhenEnter })
}))
