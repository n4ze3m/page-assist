import { create } from "zustand"

type QuickIngestStore = {
  /**
   * Number of items queued in Quick Ingest while the server
   * was offline / in bypass mode and not yet processed.
   */
  queuedCount: number
  setQueuedCount: (count: number) => void
  clearQueued: () => void
  /**
   * Whether the most recent Quick Ingest processing attempt
   * failed due to a server or network error. Used to enrich
   * header/sidepanel tooltips and ARIA labels.
   */
  hadRecentFailure: boolean
  markFailure: () => void
  clearFailure: () => void
}

export const useQuickIngestStore = create<QuickIngestStore>((set) => ({
  queuedCount: 0,
  hadRecentFailure: false,
  setQueuedCount: (count) =>
    set({
      queuedCount: count > 0 ? count : 0
    }),
  clearQueued: () =>
    set({
      queuedCount: 0
    }),
  markFailure: () =>
    set({
      hadRecentFailure: true
    }),
  clearFailure: () =>
    set({
      hadRecentFailure: false
    })
}))

if (typeof window !== "undefined") {
  // Expose for Playwright tests and debugging only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__tldw_useQuickIngestStore = useQuickIngestStore
}
