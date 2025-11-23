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

export interface AnthropicMessageOptions {
    apiKey?: string
    temperature?: number
    maxTokens?: number
    topP?: number
    topK?: number
    modelName?: string
    stopSequences?: string[]
    budgetTokens?: number
}

export interface AnthropicCallOptions extends BaseLanguageModelCallOptions { }

function convertMessagesToAnthropicFormat(messages: BaseMessage[]): Array<{
    role: "user" | "assistant"
    content: string
}> {
    const result: Array<{ role: "user" | "assistant"; content: string }> = []

    for (const message of messages) {
        const type = message._getType()
        const content = typeof message.content === "string" ? message.content : ""

        if (type === "system") {
            // System messages are handled separately
        } else if (type === "human") {
            result.push({ role: "user", content })
        } else if (type === "ai") {
            result.push({ role: "assistant", content })
        }
    }

    return result
}

export class ChatAnthropic extends SimpleChatModel<AnthropicCallOptions> {
    apiKey: string
    temperature = 1
    topP = 1
    topK?: number
    maxTokens = 1024
    modelName = "claude-sonnet-4-5-20250929"
    stopSequences?: string[]
    budgetTokens?: number

    static lc_name() {
        return "ChatAnthropic"
    }

    constructor(inputs?: AnthropicMessageOptions & BaseChatModelParams) {
        super({
            callbacks: {} as Callbacks,
            ...inputs
        })

        this.apiKey = inputs?.apiKey || (globalThis as any).ANTHROPIC_API_KEY || ""
        this.temperature = inputs?.temperature ?? this.temperature
        this.topP = inputs?.topP ?? this.topP
        this.topK = inputs?.topK
        this.maxTokens = inputs?.maxTokens ?? this.maxTokens
        this.modelName = inputs?.modelName ?? this.modelName
        this.stopSequences = inputs?.stopSequences
        this.budgetTokens = inputs?.budgetTokens
    }

    _llmType() {
        return "anthropic"
    }

    async *_streamResponseChunks(
        messages: BaseMessage[],
        _options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const convertedMessages = convertMessagesToAnthropicFormat(messages)

        // Extract system prompt if present
        let systemPrompt = ""
        for (const message of messages) {
            if (message._getType() === "system") {
                systemPrompt = typeof message.content === "string" ? message.content : ""
                break
            }
        }
        const body: any = {
            model: this.modelName.replaceAll(/[\t\n\r]/g, ""),
            max_tokens: this.maxTokens,
            messages: convertedMessages
        }

        if (this.topP !== 1) {
            body.top_p = this.topP
        } else {
            body.temperature = this.temperature
        }

        if (systemPrompt) {
            body.system = systemPrompt
        }

        if (this.topK) {
            body.top_k = this.topK
        }

        if (this.stopSequences && this.stopSequences.length > 0) {
            body.stop_sequences = this.stopSequences
        }

        if (this.budgetTokens) {
            body.thinking = {
                type: "enabled",
                budget_tokens: this.budgetTokens
            }
        }

        body.stream = true

        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "anthropic-dangerous-direct-browser-access": "true",
                    "anthropic-version": "2023-06-01",
                    "x-api-key": this.apiKey,
                },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const errorData = await response.text()
                throw new Error(`Anthropic API error: ${response.status} ${errorData}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error("No response body from Anthropic API")
            }

            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6)
                        if (data === "[DONE]") {
                            continue
                        }

                        try {
                            const event = JSON.parse(data)

                            if (event.type === "content_block_delta") {
                                const delta = event.delta
                                if (delta?.type === "text_delta" && delta.text) {
                                    const chunk = new ChatGenerationChunk({
                                        text: delta.text,
                                        message: new AIMessageChunk({
                                            content: delta.text,
                                            additional_kwargs: {}
                                        })
                                    })

                                    yield chunk
                                    await runManager?.handleLLMNewToken(delta.text)
                                }
                            }
                        } catch (e) {
                            // Ignore parse errors for non-JSON lines
                        }
                    }
                }
            }
        } catch (error) {
            throw error
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
