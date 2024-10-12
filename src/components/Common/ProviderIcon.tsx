import { ChromeIcon, CpuIcon } from "lucide-react"
import { OllamaIcon } from "../Icons/Ollama"
import { FireworksMonoIcon } from "../Icons/Fireworks"
import { GroqMonoIcon } from "../Icons/Groq"
import { LMStudioIcon } from "../Icons/LMStudio"
import { OpenAiIcon } from "../Icons/OpenAI"
import { TogtherMonoIcon } from "../Icons/Togther"
import { OpenRouterIcon } from "../Icons/OpenRouter"

export const ProviderIcons = ({
  provider,
  className
}: {
  provider: string
  className?: string
}) => {
  switch (provider) {
    case "chrome":
      return <ChromeIcon className={className} />
    case "custom":
      return <CpuIcon className={className} />
    case "fireworks":
      return <FireworksMonoIcon className={className} />
    case "groq":
      return <GroqMonoIcon className={className} />
    case "lmstudio":
      return <LMStudioIcon className={className} />
    case "openai":
      return <OpenAiIcon className={className} />
    case "together":
      return <TogtherMonoIcon className={className} />
    case "openrouter":
      return <OpenRouterIcon className={className} />
    default:
      return <OllamaIcon className={className} />
  }
}
