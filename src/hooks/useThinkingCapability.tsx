import { useQuery } from "@tanstack/react-query"
import { isThinkingCapableModel, isGptOssModel } from "@/libs/model-utils"
import { isModelThinkingCapable } from "@/services/model-capabilities"

/**
 * Resolve whether a model supports thinking/reasoning using Ollama's
 * capability API, with the name-based heuristic as the value while the
 * lookup is in flight and as the fallback if the lookup fails.
 */
export const useThinkingCapability = (model?: string | null) => {
  const { data } = useQuery({
    queryKey: ["modelThinkingCapability", model],
    queryFn: () => isModelThinkingCapable(model),
    enabled: !!model,
    staleTime: 1000 * 60 * 5,
    retry: false
  })

  return {
    supportsThinking: data ?? isThinkingCapableModel(model),
    isGptOss: isGptOssModel(model)
  }
}
