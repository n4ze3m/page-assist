type GenerationMetrics = {
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
  context?: string
  response?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

type Props = {
  generationInfo: GenerationMetrics
}

export const GenerationInfo = ({ generationInfo }: Props) => {
  if (!generationInfo) return null

  const formatDuration = (nanoseconds?: number) => {
    if (!nanoseconds) return "0ms"
    const ms = nanoseconds / 1e6
    if (ms < 1) return `${ms.toFixed(3)}ms`
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const metricsToDisplay: Record<string, unknown> = {
    ...generationInfo,
    ...(generationInfo?.usage
      ? {
          prompt_eval_count: generationInfo.usage.prompt_tokens,
          eval_count: generationInfo.usage.completion_tokens,
          total_tokens: generationInfo.usage.total_tokens
        }
      : {})
  }

  const evalCount =
    generationInfo.eval_count ?? generationInfo.usage?.completion_tokens

  if (evalCount) {
    if (generationInfo.eval_duration) {
      metricsToDisplay.tokens_per_second = (
        (evalCount / generationInfo.eval_duration) *
        1e9
      ).toFixed(2)
    } else if (generationInfo.total_duration) {
      metricsToDisplay.tokens_per_second = (
        (evalCount / generationInfo.total_duration) *
        1e9
      ).toFixed(2)
    }
  }

  return (
    <div className="p-2 w-full">
      <div className="flex flex-col gap-2">
        {Object.entries(metricsToDisplay)
          .filter(([key]) => !["model", "usage"].includes(key))
          .map(([key, value]) => (
            <div key={key} className="flex flex-wrap justify-between">
              <div className="font-medium text-xs">{key}</div>
              <div className="font-medium text-xs break-all">
                {key.includes("duration")
                  ? formatDuration(value as number)
                  : String(value)}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
