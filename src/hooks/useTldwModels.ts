import { useQuery } from "@tanstack/react-query"
import { tldwModels } from "@/services/tldw"
import { tldwClient } from "@/services/tldw"

export interface TldwModelWithMetadata {
  name: string
  model: string
  provider: string
  nickname?: string
  avatar?: string
  modified_at?: string
  size?: number
  digest?: string
  details?: any
}

export const useTldwModels = () => {
  return useQuery({
    queryKey: ["tldw-models"],
    queryFn: async () => {
      const config = await tldwClient.getConfig()
      
      if (!config || !config.serverUrl) {
        return []
      }

      try {
        const models = await tldwModels.getModels()
        
        // Transform tldw models to match the existing format
        const transformedModels: TldwModelWithMetadata[] = models.map(model => ({
          // Prefix with tldw: to distinguish from other providers
          name: `tldw:${model.id}`,
          model: `tldw:${model.id}`,
          provider: "tldw",
          nickname: model.name || model.id,
          avatar: undefined,
          modified_at: new Date().toISOString(),
          size: 0,
          digest: "",
          details: {
            provider: model.provider,
          }
        }))

        return transformedModels
      } catch (error) {
        console.error("Failed to fetch tldw models:", error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  })
}

// Hook to combine all model sources
export const useCombinedModels = (ollamaModels: any[] = [], customModels: any[] = []) => {
  const { data: tldwModelsList = [] } = useTldwModels()
  
  // Combine all model sources
  const allModels = [
    ...ollamaModels,
    ...customModels,
    ...tldwModelsList
  ]
  
  return allModels
}
