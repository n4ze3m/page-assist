import {
    BaseChatModel,
    type BaseChatModelCallOptions,
    type BaseChatModelParams,
    type BindToolsInput,
    type LangSmithParams,
} from "@langchain/core/language_models/chat_models"
import { BaseLanguageModelInput } from "@langchain/core/language_models/base"
import {
    CallbackManagerForLLMRun,
    Callbacks
} from "@langchain/core/callbacks/manager"
import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    ToolMessage,
} from "@langchain/core/messages"
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs"
import { convertToOpenAITool } from "@langchain/core/utils/function_calling"
import { concat } from "@langchain/core/utils/stream"
import { Runnable } from "@langchain/core/runnables"

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

export interface AnthropicCallOptions extends BaseChatModelCallOptions {
    tools?: BindToolsInput[]
}

function detectImageMediaType(base64Data: string): string | null {
    try {
        const binaryString = atob(base64Data.slice(0, 32))
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
            return "image/jpeg"
        }
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
            return "image/png"
        }
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            return "image/gif"
        }
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
                return "image/webp"
            }
        }
    } catch (e) {
    }
    return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToAnthropicTools(tools: BindToolsInput[]): any[] {
    return tools.map(tool => {
        const openAITool = convertToOpenAITool(tool)
        return {
            name: openAITool.function.name,
            description: openAITool.function.description || "",
            input_schema: openAITool.function.parameters || { type: "object", properties: {} }
        }
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertMessagesToAnthropicFormat(messages: BaseMessage[]): Array<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Array<any> = []

    for (const message of messages) {
        const type = message._getType()

        if (type === "system") {
            // handled separately as body.system
        } else if (type === "human") {
            if (typeof message.content === "string") {
                result.push({ role: "user", content: message.content })
            } else if (Array.isArray(message.content)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const anthropicContent: Array<any> = []

                for (const block of message.content) {
                    if (typeof block === "object") {
                        if ("text" in block && block.type === "text") {
                            anthropicContent.push({
                                type: "text",
                                text: block.text as string
                            })
                        } else if ("image_url" in block && block.type === "image_url") {
                            const imageUrl = block.image_url as string | { url: string } | undefined
                            if (typeof imageUrl === "string" && imageUrl.startsWith("data:image/")) {
                                const [header, data] = imageUrl.split(",")
                                const mediaType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg"
                                const actualMediaType = detectImageMediaType(data) || mediaType
                                anthropicContent.push({
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: actualMediaType,
                                        data: data
                                    }
                                })
                            } else if (typeof imageUrl === "string") {
                                anthropicContent.push({
                                    type: "image",
                                    source: { type: "url", url: imageUrl }
                                })
                            } else if (typeof imageUrl === "object" && imageUrl && "url" in imageUrl) {
                                const url = imageUrl.url
                                if (url.startsWith("data:image/")) {
                                    const [header, data] = url.split(",")
                                    const mediaType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg"
                                    const actualMediaType = detectImageMediaType(data) || mediaType
                                    anthropicContent.push({
                                        type: "image",
                                        source: {
                                            type: "base64",
                                            media_type: actualMediaType,
                                            data: data
                                        }
                                    })
                                } else {
                                    anthropicContent.push({
                                        type: "image",
                                        source: { type: "url", url: url }
                                    })
                                }
                            }
                        }
                    }
                }

                result.push({ role: "user", content: anthropicContent })
            } else {
                result.push({ role: "user", content: "" })
            }
        } else if (type === "ai") {
            const aiMsg = message as AIMessage
            if (aiMsg.tool_calls?.length) {
                // Build assistant message with tool_use content blocks
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blocks: any[] = []
                if (typeof aiMsg.content === "string" && aiMsg.content) {
                    blocks.push({ type: "text", text: aiMsg.content })
                }
                for (const tc of aiMsg.tool_calls) {
                    blocks.push({
                        type: "tool_use",
                        id: tc.id || `toolu_${crypto.randomUUID()}`,
                        name: tc.name,
                        input: tc.args
                    })
                }
                result.push({ role: "assistant", content: blocks })
            } else {
                const content = typeof aiMsg.content === "string" ? aiMsg.content : ""
                result.push({ role: "assistant", content })
            }
        } else if (type === "tool") {
            const toolMsg = message as ToolMessage
            const content = typeof toolMsg.content === "string"
                ? toolMsg.content
                : JSON.stringify(toolMsg.content)
            // Merge consecutive tool results into the same user message
            const prev = result[result.length - 1]
            if (
                prev?.role === "user" &&
                Array.isArray(prev.content) &&
                prev.content[0]?.type === "tool_result"
            ) {
                prev.content.push({
                    type: "tool_result",
                    tool_use_id: toolMsg.tool_call_id,
                    content
                })
            } else {
                result.push({
                    role: "user",
                    content: [{
                        type: "tool_result",
                        tool_use_id: toolMsg.tool_call_id,
                        content
                    }]
                })
            }
        }
    }

    return result
}

export class ChatAnthropic extends BaseChatModel<AnthropicCallOptions, AIMessageChunk> {
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

    getLsParams(_options: this["ParsedCallOptions"]): LangSmithParams {
        return {
            ls_provider: "anthropic",
            ls_model_name: this.modelName,
            ls_model_type: "chat" as const,
            ls_temperature: this.temperature,
            ls_max_tokens: this.maxTokens,
            ls_stop: this.stopSequences,
        }
    }

    override bindTools(
        tools: BindToolsInput[],
        kwargs?: Partial<this["ParsedCallOptions"]>
    ): Runnable<BaseLanguageModelInput, AIMessageChunk, AnthropicCallOptions> {
        return this.withConfig({
            tools: tools.map(tool => convertToOpenAITool(tool)),
            ...kwargs,
        } as Partial<AnthropicCallOptions>)
    }

    async _generate(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        let finalChunk: AIMessageChunk | undefined
        for await (const chunk of this._streamResponseChunks(messages, options, runManager)) {
            if (!finalChunk) {
                finalChunk = chunk.message as AIMessageChunk
            } else {
                finalChunk = concat(finalChunk, chunk.message as AIMessageChunk)
            }
        }

        const nonChunkMessage = new AIMessage({
            content: finalChunk?.content ?? "",
            additional_kwargs: finalChunk?.additional_kwargs,
            tool_calls: finalChunk?.tool_calls,
            response_metadata: finalChunk?.response_metadata,
            usage_metadata: finalChunk?.usage_metadata,
        })
        return {
            generations: [{
                text: typeof nonChunkMessage.content === "string" ? nonChunkMessage.content : "",
                message: nonChunkMessage,
            }]
        }
    }

    async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const convertedMessages = convertMessagesToAnthropicFormat(messages)

        let systemPrompt = ""
        for (const message of messages) {
            if (message._getType() === "system") {
                systemPrompt = typeof message.content === "string" ? message.content : ""
                break
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // Tools from bindTools or direct call options
        const tools = options?.tools?.length ? options.tools : undefined
        if (tools) {
            body.tools = convertToAnthropicTools(tools)
        }

        body.stream = true

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true",
            "anthropic-version": "2023-06-01",
            "x-api-key": this.apiKey,
        }

        if (this.budgetTokens) {
            headers["anthropic-beta"] = "interleaved-thinking-2025-05-14"
        }

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: options?.signal,
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
        let currentBlockIndex = 0

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                    const event = JSON.parse(data)

                    if (event.type === "content_block_start") {
                        currentBlockIndex = event.index ?? 0
                        if (event.content_block?.type === "tool_use") {
                            // Beginning of a tool call — emit chunk with name + id
                            yield new ChatGenerationChunk({
                                text: "",
                                message: new AIMessageChunk({
                                    content: "",
                                    tool_call_chunks: [{
                                        id: event.content_block.id,
                                        name: event.content_block.name,
                                        args: "",
                                        index: currentBlockIndex,
                                        type: "tool_call_chunk"
                                    }]
                                })
                            })
                        }
                    } else if (event.type === "content_block_delta") {
                        const delta = event.delta
                        if (delta?.type === "text_delta" && delta.text) {
                            yield new ChatGenerationChunk({
                                text: delta.text,
                                message: new AIMessageChunk({
                                    content: delta.text,
                                    additional_kwargs: {}
                                })
                            })
                            await runManager?.handleLLMNewToken(delta.text)
                        } else if (delta?.type === "thinking_delta" && delta.thinking) {
                            // Extended thinking — surface as reasoning_content
                            yield new ChatGenerationChunk({
                                text: "",
                                message: new AIMessageChunk({
                                    content: "",
                                    additional_kwargs: {
                                        reasoning_content: delta.thinking
                                    }
                                })
                            })
                        } else if (delta?.type === "input_json_delta") {
                            // Streaming tool call arguments
                            yield new ChatGenerationChunk({
                                text: "",
                                message: new AIMessageChunk({
                                    content: "",
                                    tool_call_chunks: [{
                                        args: delta.partial_json ?? "",
                                        index: event.index ?? currentBlockIndex,
                                        type: "tool_call_chunk"
                                    }]
                                })
                            })
                        }
                    }
                } catch (e) {
                    // Ignore JSON parse errors for non-data lines
                }
            }
        }
    }
}
