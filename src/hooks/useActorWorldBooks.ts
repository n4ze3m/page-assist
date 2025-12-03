import React from "react"
import { useQuery } from "@tanstack/react-query"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { useServerOnline } from "@/hooks/useServerOnline"

export type ActorWorldBook = {
  id: string
  name: string
  description?: string
}

export type ActorWorldBookEntry = {
  entry_id: string
  keywords?: string[]
  content: string
  enabled?: boolean
}

export type ActorWorldBooksState = {
  worldBooks: ActorWorldBook[]
  worldBooksLoading: boolean
  entriesByWorldBook: Record<string, ActorWorldBookEntry[]>
  entriesLoading: Record<string, boolean>
  loadEntriesForWorldBook: (worldBookId: string) => Promise<void>
}

export function useActorWorldBooks(): ActorWorldBooksState {
  const isOnline = useServerOnline()
  const [entriesByWorldBook, setEntriesByWorldBook] =
    React.useState<Record<string, ActorWorldBookEntry[]>>({})
  const [entriesLoading, setEntriesLoading] = React.useState<
    Record<string, boolean>
  >({})

  const entriesRef = React.useRef(entriesByWorldBook)
  entriesRef.current = entriesByWorldBook

  const { data: worldBooks, isLoading: worldBooksLoading } = useQuery({
    queryKey: ["tldw:actorWorldBooks"],
    queryFn: async () => {
      await tldwClient.initialize()
      const res = await tldwClient.listWorldBooks(false)
      const raw = (res?.world_books || []) as any[]
      return raw.map((wb) => ({
        id: String(wb.id),
        name: wb.name,
        description: wb.description
      }))
    },
    enabled: isOnline,
    staleTime: 60_000
  })

  const loadEntriesForWorldBook = React.useCallback(async (worldBookId: string) => {
    const id = String(worldBookId || "")
    if (!id) return
    if (entriesRef.current[id]) return

    setEntriesLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await tldwClient.initialize()
      const res = await tldwClient.listWorldBookEntries(id, true)
      const rawEntries = (res?.entries || []) as any[]
      const entries: ActorWorldBookEntry[] = rawEntries.map((entry) => ({
        entry_id: String(entry.entry_id),
        keywords: entry.keywords || [],
        content: entry.content || "",
        enabled: entry.enabled
      }))
      setEntriesByWorldBook((prev) => ({
        ...prev,
        [id]: entries
      }))
    } catch (error) {
      console.error("Failed to load world book entries", error)
      setEntriesByWorldBook((prev) => ({
        ...prev,
        [id]: []
      }))
    } finally {
      setEntriesLoading((prev) => ({
        ...prev,
        [id]: false
      }))
    }
  }, [])

  return {
    worldBooks: worldBooks || [],
    worldBooksLoading,
    entriesByWorldBook,
    entriesLoading,
    loadEntriesForWorldBook
  }
}
