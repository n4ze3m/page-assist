import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
  MessageContent
} from "@langchain/core/messages"
import { tldwChat, ChatMessage } from "@/services/tldw"

export interface ChatTldwOptions {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  streaming?: boolean
}

export class ChatTldw {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  streaming: boolean

  constructor(options: ChatTldwOptions) {
    // Normalize model id: drop internal prefix like "tldw:" so server receives provider/model
    this.model = String(options.model || '').replace(/^tldw:/, '')
    this.temperature = options.temperature ?? 0.7
    this.maxTokens = options.maxTokens
    this.topP = options.topP ?? 1
    this.frequencyPenalty = options.frequencyPenalty ?? 0
    this.presencePenalty = options.presencePenalty ?? 0
    this.systemPrompt = options.systemPrompt
    this.streaming = options.streaming ?? false
  }

  /**
   * Streaming API used by existing chat modes.
   *
   * This intentionally mirrors the previous `ollama.stream(...)` contract:
   * - yields plain string tokens
   * - optionally calls `callbacks[i].handleLLMEnd(result)` once at the end
   */
  async stream(
    messages: BaseMessage[],
    options?: {
      signal?: AbortSignal
      // Matches the shape used in normalChatMode/search/rag, where
      // callbacks: [{ handleLLMEnd(output) { ... } }]
      callbacks?: Array<{ handleLLMEnd?: (output: any) => any }>
    }
  ): Promise<AsyncGenerator<any, void, unknown>> {
    const { signal, callbacks } = options || {}

    const tldwMessages = this.convertToTldwMessages(messages)
    const stream = tldwChat.streamMessage(tldwMessages, {
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      topP: this.topP,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
      systemPrompt: this.systemPrompt,
      stream: true
    })

    const self = this
    async function* generator() {
      let fullText = ""
      try {
        for await (const token of stream) {
          if (signal?.aborted) {
            break
          }
          if (typeof token !== "string") continue
          fullText += token
          // Downstream chat-modes treat chunks as strings or objects with
          // `content` / `choices[0].delta.content`. Yielding the plain
          // string keeps the simple path working (`typeof chunk === 'string'`).
          yield token
        }
      } finally {
        // Synthesize a minimal LangChain-style result for handleLLMEnd
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

  // Non-streaming helper mirroring the LangChain-style _generate,
  // used only internally if needed.
  async generateOnce(
    messages: BaseMessage[]
  ): Promise<{ text: string; message: AIMessage }> {
    const tldwMessages = this.convertToTldwMessages(messages)
    
    const response = await tldwChat.sendMessage(tldwMessages, {
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      topP: this.topP,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
      systemPrompt: this.systemPrompt,
      stream: false
    })

    return {
      text: response,
      message: new AIMessage(response)
    }
  }

  // We don't rely on BaseChatModel's default stream helper in the current
  // chat pipeline; see the custom `stream` implementation above which
  // matches the expected `ollama.stream` contract.

  private convertToTldwMessages(messages: BaseMessage[]): ChatMessage[] {
    return messages.map(msg => {
      let role: 'system' | 'user' | 'assistant' = 'user'
      
      if (msg instanceof SystemMessage) {
        role = 'system'
      } else if (msg instanceof AIMessage) {
        role = 'assistant'
      } else if (msg instanceof HumanMessage) {
        role = 'user'
      }

      // Handle different content types
      let content: string
      if (typeof msg.content === 'string') {
        content = msg.content
      } else if (Array.isArray(msg.content)) {
        // Handle multimodal content
        content = msg.content
          .map((item: any) => {
            if (typeof item === 'string') {
              return item
            } else if (item.type === 'text') {
              return item.text
            }
            return ''
          })
          .join('\n')
      } else {
        content = String(msg.content)
      }

      return {
        role,
        content
      }
    })
  }

  // Method to check if tldw is available
  static async isAvailable(): Promise<boolean> {
    try {
      return await tldwChat.isReady()
    } catch {
      return false
    }
  }

  // Method to cancel the current stream
  cancelStream(): void {
    tldwChat.cancelStream()
  }
}
