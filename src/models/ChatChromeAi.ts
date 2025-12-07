import { BaseMessage, AIMessage } from "@/types/messages"
import { AITextSession, checkChromeAIAvailability, createAITextSession } from "./utils/chrome"

export interface AITextSessionOptions {
  topK: number
  temperature: number
}

export const enum AIModelAvailability {
  Readily = "readily",
  AfterDownload = "after-download",
  No = "no"
}

export interface ChromeAIInputs {
  topK?: number
  temperature?: number
  promptFormatter?: (messages: BaseMessage[]) => string
}

function formatPrompt(messages: BaseMessage[]): string {
  return messages
    .map((message) => {
      if (typeof message.content !== "string") {
        if (Array.isArray(message.content) && message.content.length > 0) {
          const first = message.content[0]
          if (typeof first === "object" && "text" in first) {
            return first.text || ""
          }
        }
        return ""
      }
      return `${message._getType()}: ${message.content}`
    })
    .join("\n")
}

/**
 * Converts a ReadableStream to an async iterable.
 */
async function* streamToAsyncIterable<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

export class ChatChromeAI {
  session?: AITextSession
  temperature = 0.8
  topK = 120
  promptFormatter: (messages: BaseMessage[]) => string

  constructor(inputs?: ChromeAIInputs) {
    this.temperature = inputs?.temperature ?? this.temperature
    this.topK = inputs?.topK ?? this.topK
    this.promptFormatter = inputs?.promptFormatter ?? formatPrompt
  }

  /**
   * Initialize the model. This method must be called before calling `.stream()` or `.invoke()`.
   */
  async initialize() {
    if (typeof window === "undefined") {
      throw new Error("ChatChromeAI can only be used in the browser.")
    }

    const canCreateTextSession = await checkChromeAIAvailability()
    if (canCreateTextSession === AIModelAvailability.No) {
      throw new Error("The AI model is not available.")
    } else if (canCreateTextSession === AIModelAvailability.AfterDownload) {
      throw new Error("The AI model is not yet downloaded.")
    }

    this.session = await createAITextSession({
      topK: this.topK,
      temperature: this.temperature,
    })
  }

  /**
   * Call `.destroy()` to free resources if you no longer need a session.
   */
  destroy() {
    if (!this.session) {
      return console.error("No session found. Returning.")
    }
    this.session.destroy()
  }

  /**
   * Streaming API matching the contract used by chat modes.
   * Yields string tokens and optionally calls callbacks at the end.
   */
  async stream(
    messages: BaseMessage[],
    options?: {
      signal?: AbortSignal
      callbacks?: Array<{ handleLLMEnd?: (output: any) => any }>
    }
  ): Promise<AsyncGenerator<any, void, unknown>> {
    const { signal, callbacks } = options || {}

    if (!this.session) {
      await this.initialize()
    }

    const textPrompt = this.promptFormatter(messages)
    const readableStream = this.session!.promptStreaming(textPrompt)

    const self = this
    async function* generator() {
      let fullText = ""
      let previousContent = ""

      try {
        for await (const chunk of streamToAsyncIterable(readableStream)) {
          if (signal?.aborted) {
            break
          }

          // Chrome AI may return cumulative content, so extract new content
          const newContent =
            typeof (globalThis as any).LanguageModel !== "undefined"
              ? chunk
              : (chunk as string).slice(previousContent.length)
          previousContent += newContent
          fullText += newContent

          yield newContent
        }
      } finally {
        // Synthesize a minimal result for handleLLMEnd
        if (callbacks && callbacks.length > 0) {
          const result = {
            generations: [[{ text: fullText, generationInfo: undefined }]]
          }
          for (const cb of callbacks) {
            try {
              await cb?.handleLLMEnd?.(result)
            } catch {
              // Ignore callback errors to avoid breaking chat flow
            }
          }
        }
      }
    }

    return generator()
  }

  /**
   * Non-streaming invoke method for simpler use cases.
   */
  async invoke(messages: BaseMessage[]): Promise<{ content: string }> {
    let fullText = ""
    const gen = await this.stream(messages)
    for await (const token of gen) {
      if (typeof token === "string") {
        fullText += token
      }
    }
    return { content: fullText }
  }

  /**
   * Check if Chrome AI is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const availability = await checkChromeAIAvailability()
      return availability === AIModelAvailability.Readily
    } catch {
      return false
    }
  }
}
