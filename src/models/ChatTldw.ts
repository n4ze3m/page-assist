import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
  MessageContent
} from "@langchain/core/messages"
import { ChatGenerationChunk } from "@langchain/core/outputs"
import { AIMessageChunk } from "@langchain/core/messages" 
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager"
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

export class ChatTldw extends BaseChatModel {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  streaming: boolean

  constructor(options: ChatTldwOptions) {
    super({})
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

  _llmType(): string {
    return "tldw"
  }

  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<any> {
    const tldwMessages = this.convertToTldwMessages(messages)
    
    if (this.streaming && runManager) {
      // Use streaming
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

      let fullContent = ""
      for await (const chunk of stream) {
        fullContent += chunk
        await runManager.handleLLMNewToken(chunk)
      }

      return {
        generations: [
          {
            text: fullContent,
            message: new AIMessage(fullContent)
          }
        ]
      }
    } else {
      // Non-streaming
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
        generations: [
          {
            text: response,
            message: new AIMessage(response)
          }
        ]
      }
    }
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<any> {
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

    for await (const chunk of stream) {
      if (runManager) {
        await runManager.handleLLMNewToken(chunk)
      }
      // Yield an AIMessageChunk so downstream expects chunk.content
      yield new AIMessageChunk({ content: chunk })
    }
  }

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
