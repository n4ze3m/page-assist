import { create } from "zustand"

import type { ActorSettings } from "@/types/actor"
import { createDefaultActorSettings } from "@/types/actor"

type ActorUiStoreState = {
  /**
   * Current chat's Actor settings in memory.
   * Persisted per-chat via services/actor-settings.
   */
  settings: ActorSettings | null
  /**
   * Cached preview text built from settings.
   */
  preview: string
  /**
   * Rough token estimate for the preview.
   */
  tokenCount: number
  /**
   * Replace current settings.
   */
  setSettings: (next: ActorSettings | null) => void
  /**
   * Update preview + token count together.
   */
  setPreviewAndTokens: (preview: string, tokenCount: number) => void
  /**
   * Reset in-memory Actor UI state.
   */
  reset: () => void
}

export const useActorStore = create<ActorUiStoreState>((set) => ({
  settings: null,
  preview: "",
  tokenCount: 0,
  setSettings: (next: ActorSettings | null) => {
    set({
      settings: next
    })
  },
  setPreviewAndTokens: (preview: string, tokenCount: number) =>
    set({
      preview,
      tokenCount
    }),
  reset: () =>
    set({
      settings: createDefaultActorSettings(),
      preview: "",
      tokenCount: 0
    })
}))
