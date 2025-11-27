import { useQuery } from "@tanstack/react-query"
import { useConnectionState } from "@/hooks/useConnectionState"
import { tldwClient, type ServerChatSummary } from "@/services/tldw/TldwApiClient"

export type ServerChatHistoryItem = ServerChatSummary & {
  createdAtMs: number
  updatedAtMs?: number | null
}

export const useServerChatHistory = (searchQuery: string) => {
  const { isConnected } = useConnectionState()
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const query = useQuery({
    queryKey: ["serverChatHistory", normalizedQuery],
    enabled: isConnected,
    queryFn: async (): Promise<ServerChatHistoryItem[]> => {
      await tldwClient.initialize().catch(() => null)
      try {
        const chats = await tldwClient.listChats({
          limit: 100,
          ordering: "-updated_at"
        })

        const mapped: ServerChatHistoryItem[] = chats.map((c) => ({
          ...c,
          createdAtMs: Date.parse(c.created_at || ""),
          updatedAtMs: c.updated_at ? Date.parse(c.updated_at) : null
        }))

        if (!normalizedQuery) {
          return mapped
        }

        return mapped.filter((item) => {
          const haystack = `${item.title || ""} ${item.topic_label || ""} ${item.state || ""}`.toLowerCase()
          return haystack.includes(normalizedQuery)
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          "[serverChatHistory] Failed to fetch server chats",
          e
        )
        throw e
      }
    },
    staleTime: 30_000,
    retry: 1
  })

  return query
}
