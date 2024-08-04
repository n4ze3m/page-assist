import { ChatChromeAI } from "./ChatChromeAi"
import { ChatOllama } from "./ChatOllama"

export const pageAssistModel = async ({
  model,
  baseUrl,
  keepAlive,
  temperature,
  topK,
  topP,
  numCtx,
  seed
}: {
  model: string
  baseUrl: string
  keepAlive?: string
  temperature?: number
  topK?: number
  topP?: number
  numCtx?: number
  seed?: number
}) => {
  switch (model) {
    case "chrome::gemini-nano::page-assist":
      return new ChatChromeAI({
        temperature,
        topK
      })
    default:
      return new ChatOllama({
        baseUrl,
        keepAlive,
        temperature,
        topK,
        topP,
        numCtx,
        seed,
        model
      })
  }
}
