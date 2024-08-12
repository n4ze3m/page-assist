import { ChatChromeAI } from "./ChatChromeAi"
import { ChatOllama } from "./ChatOllama"
import { ChatOpenAI } from "./ChatOpenAI"

export const pageAssistModel = async ({
  model,
  baseUrl,
  apiKey,
  keepAlive,
  temperature,
  topK,
  topP,
  numCtx,
  seed
}: {
  model: string
  baseUrl: string
  keepAlive: string
  temperature: number
  topK: number
  topP: number
  numCtx: number
  seed: number
}) => {
  switch (model) {
    case "chrome::gemini-nano::page-assist":
      return new ChatChromeAI({
        temperature,
        topK
      })
    default:
      return new ChatOpenAI({
        baseUrl,
        apiKey,
        model,
        temperature,
        topK
      })
    // return new ChatOllama({
    //   baseUrl,
    //   keepAlive,
    //   temperature,
    //   topK,
    //   topP,
    //   numCtx,
    //   seed,
    //   model
    // })
  }
}
