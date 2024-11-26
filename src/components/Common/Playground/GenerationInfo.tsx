type GenerationMetrics = {
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
  context?: string
  response?: string
}

type Props = {
  generationInfo: GenerationMetrics
}

export const GenerationInfo = ({ generationInfo }: Props) => {
  if (!generationInfo) return null

  const calculateTokensPerSecond = (
    evalCount?: number,
    evalDuration?: number
  ) => {
    if (!evalCount || !evalDuration) return 0
    return (evalCount / evalDuration) * 1e9
  }

  const formatDuration = (nanoseconds?: number) => {
    if (!nanoseconds) return "0ms"
    const ms = nanoseconds / 1e6
    if (ms < 1) return `${ms.toFixed(3)}ms`
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const metricsToDisplay = {
    ...generationInfo,
    ...(generationInfo?.eval_count && generationInfo?.eval_duration
      ? {
          tokens_per_second: calculateTokensPerSecond(
            generationInfo.eval_count,
            generationInfo.eval_duration
          ).toFixed(2)
        }
      : {})
  }

  return (
    <div className="p-2 w-full">
      <div className="flex flex-col gap-2">
        {Object.entries(metricsToDisplay)
          .filter(([key]) => key !== "model")
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
