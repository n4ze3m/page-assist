import {
  SimpleChatModel,
  type BaseChatModelParams
} from "@langchain/core/language_models/chat_models"
import type { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base"
import {
  CallbackManagerForLLMRun,
  Callbacks
} from "@langchain/core/callbacks/manager"
import { BaseMessage, AIMessageChunk } from "@langchain/core/messages"
import { ChatGenerationChunk } from "@langchain/core/outputs"
import OpenAI from "openai"

export interface AI {
  createTextSession(options?: AITextSessionOptions): Promise<AITextSession>
  defaultTextSessionOptions(): Promise<AITextSessionOptions>
}

export interface AITextSession {
  prompt(input: string): Promise<string>
  promptStreaming(input: string): ReadableStream
  destroy(): void
  clone(): AITextSession
}

export interface AITextSessionOptions {
  topK: number
  temperature: number
}

export interface OpenAIInputs extends BaseChatModelParams {
  model?: string
  topK?: number
  temperature?: number
  maxTokens?: number

  /**
   * An optional function to format the prompt before sending it to the model.
   */
  promptFormatter?: (messages: BaseMessage[]) => string
}

export interface OpenAICallOptions extends BaseLanguageModelCallOptions {}

function formatPrompt(messages: BaseMessage[]): string {
  return messages
    .map((message) => {
      if (typeof message.content !== "string") {
        // console.log(message.content)
        // throw new Error(
        //   "OpenAI does not support non-string message content."
        // )
        if (message.content.length > 0) {
          //@ts-ignore
          return message.content[0]?.text || ""
        }

        return ""
      }
      return `${message._getType()}: ${message.content}`
    })
    .join("\n")
}

/**
 * To use this model you need to have the `OpenAI` API key.
 * @link https://openai.com/api/
 *
 * @example
 * ```typescript
 * // Initialize the OpenAI model.
 * const model = new OpenAI({
 *   temperature: 0.5, // Optional. Default is 0.5.
 *   topK: 40, // Optional. Default is 40.
 * });
 *
 * // Call the model with a message and await the response.
 * const response = await model.invoke([
 *   new HumanMessage({ content: "My name is John." }),
 * ]);
 * ```
 */
export class ChatOpenAI extends SimpleChatModel<OpenAICallOptions> {
  client?: OpenAI

  baseURL = "https://api.openai.com/v1"

  apiKey = ""

  model = "gpt-3.5-turbo"

  topK = 40

  temperature = 0.5

  maxTokens = 1024

  promptFormatter: (messages: BaseMessage[]) => string

  static lc_name() {
    return "OpenAI"
  }

  constructor(inputs?: OpenAIInputs) {
    super({
      callbacks: {} as Callbacks,
      ...inputs
    })
    this.baseURL = inputs?.baseURL ?? this.baseURL
    this.apiKey = inputs?.apiKey ?? this.apiKey
    this.model = inputs?.model ?? this.model
    this.temperature = inputs?.temperature ?? this.temperature
    this.topK = inputs?.topK ?? this.topK
    this.maxTokens = inputs?.maxTokens ?? this.maxTokens
    this.promptFormatter = inputs?.promptFormatter ?? formatPrompt
  }

  _llmType() {
    return "open-ai"
  }

  /**
   * Initialize the model. This method must be called before calling `.invoke()`.
   */
  async initialize() {
    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  /**
   * Call `.destroy()` to free resources if you no longer need a session.
   * When a session is destroyed, it can no longer be used, and any ongoing
   * execution will be aborted. You may want to keep the session around if
   * you intend to prompt the model often since creating a session can take
   * some time.
   */
  destroy() {
    this.client = undefined
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    if (!this.client) {
      await this.initialize()
    }
    const textPrompt = this.promptFormatter(messages)
    const stream = await this.client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: textPrompt }],
      stream: true
    })
    for await (const chunk of stream) {
      yield new ChatGenerationChunk({
        text: chunk.choices[0]?.delta?.content || "",
        message: new AIMessageChunk({
          content: chunk.choices[0]?.delta?.content || "",
          additional_kwargs: {}
        })
      })
      await runManager?.handleLLMNewToken(
        chunk.choices[0]?.delta?.content || ""
      )
    }
  }

  async _call(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const chunks = []
    for await (const chunk of this._streamResponseChunks(
      messages,
      options,
      runManager
    )) {
      chunks.push(chunk.text)
    }
    return chunks.join("")
  }
}
