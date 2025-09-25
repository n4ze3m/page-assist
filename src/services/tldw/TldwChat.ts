import { tldwClient, ChatMessage, ChatCompletionRequest } from "./TldwApiClient"

export interface TldwChatOptions {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stream?: boolean
  systemPrompt?: string
}

export interface ChatStreamChunk {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason?: string | null
  }>
}

export class TldwChatService {
  private currentController: AbortController | null = null

  /**
   * Send a chat completion request
   */
  async sendMessage(
    messages: ChatMessage[],
    options: TldwChatOptions
  ): Promise<string> {
    try {
      await tldwClient.initialize()

      const request: ChatCompletionRequest = {
        messages,
        model: options.model,
        stream: false,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty
      }

      // Add system prompt if provided
      if (options.systemPrompt && messages[0]?.role !== 'system') {
        request.messages = [
          { role: 'system', content: options.systemPrompt },
          ...messages
        ]
      }

      const response = await tldwClient.createChatCompletion(request)
      const data = await response.json().catch(() => null)
      const content = data?.choices?.[0]?.message?.content || data?.content || data?.text
      if (typeof content === 'string') {
        return content
      }
      throw new Error('Invalid response format from tldw server')
    } catch (error) {
      console.error('Chat completion failed:', error)
      throw error
    }
  }

  /**
   * Send a streaming chat completion request
   */
  async *streamMessage(
    messages: ChatMessage[],
    options: TldwChatOptions,
    onChunk?: (chunk: ChatStreamChunk) => void
  ): AsyncGenerator<string, void, unknown> {
    try {
      await tldwClient.initialize()

      // Cancel any existing stream
      this.cancelStream()

      // Create new abort controller
      this.currentController = new AbortController()

      const request: ChatCompletionRequest = {
        messages,
        model: options.model,
        stream: true,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty
      }

      // Add system prompt if provided
      if (options.systemPrompt && messages[0]?.role !== 'system') {
        request.messages = [
          { role: 'system', content: options.systemPrompt },
          ...messages
        ]
      }

      const stream = tldwClient.streamChatCompletion(request, { signal: this.currentController.signal })

      for await (const chunk of stream) {
        // Check if stream was cancelled
        if (this.currentController?.signal.aborted) {
          break
        }

        // Call the onChunk callback if provided
        if (onChunk) {
          onChunk(chunk)
        }

        // Extract and yield the content
        if (chunk?.choices && chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content
        } else if (typeof (chunk as any)?.content === 'string') {
          yield (chunk as any).content
        } else if (typeof (chunk as any)?.message?.content === 'string') {
          yield (chunk as any).message.content
        } else if (typeof chunk === 'string') {
          // Some servers stream plain strings
          yield chunk
        }
      }
    } catch (error) {
      console.error('Stream completion failed:', error)
      throw error
    } finally {
      this.currentController = null
    }
  }

  /**
   * Cancel the current streaming request
   */
  cancelStream(): void {
    if (this.currentController) {
      this.currentController.abort()
      this.currentController = null
    }
  }

  /**
   * Create a conversation with context
   */
  buildConversation(
    history: ChatMessage[],
    newMessage: string,
    systemPrompt?: string
  ): ChatMessage[] {
    const messages: ChatMessage[] = []

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Add history
    messages.push(...history)

    // Add new user message
    messages.push({ role: 'user', content: newMessage })

    return messages
  }

  /**
   * Format a response for display
   */
  formatResponse(content: string): string {
    // Basic formatting - can be enhanced
    return content.trim()
  }

  /**
   * Check if the service is ready
   */
  async isReady(): Promise<boolean> {
    try {
      await tldwClient.initialize()
      return await tldwClient.healthCheck()
    } catch {
      return false
    }
  }

  /**
   * Get token estimate for messages
   * This is a rough estimate - actual tokens depend on the model
   */
  estimateTokens(messages: ChatMessage[]): number {
    let totalChars = 0
    for (const msg of messages) {
      totalChars += msg.content.length
    }
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4)
  }

  /**
   * Truncate messages to fit within token limit
   */
  truncateMessages(
    messages: ChatMessage[],
    maxTokens: number,
    keepSystemPrompt: boolean = true
  ): ChatMessage[] {
    const result: ChatMessage[] = []
    let currentTokens = 0

    // Keep system prompt if requested
    if (keepSystemPrompt && messages[0]?.role === 'system') {
      result.push(messages[0])
      currentTokens += this.estimateTokens([messages[0]])
    }

    // Add messages from the end (most recent first)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      
      // Skip system prompt if already added
      if (msg.role === 'system' && result.length > 0 && result[0].role === 'system') {
        continue
      }

      const msgTokens = this.estimateTokens([msg])
      if (currentTokens + msgTokens <= maxTokens) {
        result.splice(keepSystemPrompt ? 1 : 0, 0, msg)
        currentTokens += msgTokens
      } else {
        break
      }
    }

    return result
  }
}

// Singleton instance
export const tldwChat = new TldwChatService()
