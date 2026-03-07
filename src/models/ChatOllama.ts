import { BaseLanguageModelInput } from "@langchain/core/language_models/base"
import {
    BaseChatModel,
    type BaseChatModelParams,
    type BaseChatModelCallOptions,
    type LangSmithParams,
    type BindToolsInput,
} from "@langchain/core/language_models/chat_models"
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager"
import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    ChatMessage,
    ToolMessage,
} from "@langchain/core/messages"
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs"
import type { StringWithAutocomplete } from "@langchain/core/utils/types"
import { convertToOpenAITool } from "@langchain/core/utils/function_calling"
import { concat } from "@langchain/core/utils/stream"
import { Runnable } from "@langchain/core/runnables"

import {
    createOllamaChatStream,
    createOllamaGenerateStream,
    parseKeepAlive,
    type OllamaInput,
    type OllamaMessage,
} from "./utils/ollama"

export interface ChatOllamaCallOptions extends BaseChatModelCallOptions {
    tools?: BindToolsInput[]
}

export interface ChatOllamaInput extends OllamaInput { }

export class ChatOllama
    extends BaseChatModel<ChatOllamaCallOptions, AIMessageChunk>
    implements ChatOllamaInput {
    static lc_name() {
        return "ChatOllama"
    }

    lc_serializable = true

    model = "llama2"

    baseUrl = "http://localhost:11434"

    keepAlive?: string

    thinking?: boolean | "low" | "medium" | "high"

    embeddingOnly?: boolean

    f16KV?: boolean

    frequencyPenalty?: number

    headers?: Record<string, string>

    logitsAll?: boolean

    lowVram?: boolean

    mainGpu?: number

    mirostat?: number

    mirostatEta?: number

    mirostatTau?: number

    numBatch?: number

    numCtx?: number

    numGpu?: number

    numGqa?: number

    numKeep?: number

    numPredict?: number

    numThread?: number

    penalizeNewline?: boolean

    presencePenalty?: number

    repeatLastN?: number

    repeatPenalty?: number

    ropeFrequencyBase?: number

    ropeFrequencyScale?: number

    temperature?: number

    stop?: string[]

    tfsZ?: number

    topK?: number

    topP?: number

    minP?: number

    typicalP?: number

    useMLock?: boolean

    useMMap?: boolean

    useMlock?: boolean

    vocabOnly?: boolean

    seed?: number

    format?: StringWithAutocomplete<"json">

    constructor(fields: OllamaInput & BaseChatModelParams) {
        super(fields)
        this.model = fields.model ?? this.model
        this.baseUrl = fields.baseUrl?.endsWith("/")
            ? fields.baseUrl.slice(0, -1)
            : fields.baseUrl ?? this.baseUrl
        this.keepAlive = parseKeepAlive(fields.keepAlive)
        this.embeddingOnly = fields.embeddingOnly
        this.f16KV = fields.f16KV
        this.frequencyPenalty = fields.frequencyPenalty
        this.headers = fields.headers
        this.logitsAll = fields.logitsAll
        this.lowVram = fields.lowVram
        this.mainGpu = fields.mainGpu
        this.mirostat = fields.mirostat
        this.mirostatEta = fields.mirostatEta
        this.mirostatTau = fields.mirostatTau
        this.numBatch = fields.numBatch
        this.numCtx = fields.numCtx
        this.numGpu = fields.numGpu === null ? undefined : fields.numGpu
        this.numGqa = fields.numGqa
        this.numKeep = fields.numKeep
        this.numPredict = fields.numPredict
        this.numThread = fields.numThread
        this.penalizeNewline = fields.penalizeNewline
        this.presencePenalty = fields.presencePenalty
        this.repeatLastN = fields.repeatLastN
        this.repeatPenalty = fields.repeatPenalty
        this.ropeFrequencyBase = fields.ropeFrequencyBase
        this.ropeFrequencyScale = fields.ropeFrequencyScale
        this.temperature = fields.temperature
        this.stop = fields.stop
        this.tfsZ = fields.tfsZ
        this.topK = fields.topK
        this.topP = fields.topP
        this.minP = fields.minP
        this.typicalP = fields.typicalP
        this.useMLock = fields.useMLock
        this.useMMap = fields.useMMap
        this.useMlock = fields.useMlock
        this.vocabOnly = fields.vocabOnly
        this.format = fields.format
        this.seed = fields.seed
        this.thinking = fields.thinking
    }

    getLsParams(options: this["ParsedCallOptions"]): LangSmithParams {
        const params = this.invocationParams(options)
        return {
            ls_provider: "ollama",
            ls_model_name: this.model,
            ls_model_type: "chat" as const,
            ls_temperature: this.temperature ?? undefined,
            ls_stop: this.stop,
            ls_max_tokens: params.options.num_predict,
        }
    }

    _llmType() {
        return "ollama"
    }

    override bindTools(
        tools: BindToolsInput[],
        kwargs?: Partial<this["ParsedCallOptions"]>
    ): Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOllamaCallOptions> {
        return this.withConfig({
            tools: tools.map((tool) => convertToOpenAITool(tool)),
            ...kwargs,
        } as Partial<ChatOllamaCallOptions>)
    }

    /**
     * A method that returns the parameters for an Ollama API call. It
     * includes model and options parameters.
     * @param options Optional parsed call options.
     * @returns An object containing the parameters for an Ollama API call.
     */
    invocationParams(options?: this["ParsedCallOptions"]) {
        return {
            model: this.model,
            format: this.format,
            keep_alive: this.keepAlive,
            think: this.thinking,
            options: {
                embedding_only: this.embeddingOnly,
                f16_kv: this.f16KV,
                frequency_penalty: this.frequencyPenalty,
                logits_all: this.logitsAll,
                low_vram: this.lowVram,
                main_gpu: this.mainGpu,
                mirostat: this.mirostat,
                mirostat_eta: this.mirostatEta,
                mirostat_tau: this.mirostatTau,
                num_batch: this.numBatch,
                num_ctx: this.numCtx,
                num_gpu: this.numGpu,
                num_gqa: this.numGqa,
                num_keep: this.numKeep,
                num_predict: this.numPredict,
                num_thread: this.numThread,
                penalize_newline: this.penalizeNewline,
                presence_penalty: this.presencePenalty,
                repeat_last_n: this.repeatLastN,
                repeat_penalty: this.repeatPenalty,
                rope_frequency_base: this.ropeFrequencyBase,
                rope_frequency_scale: this.ropeFrequencyScale,
                temperature: this.temperature,
                stop: options?.stop ?? this.stop,
                tfs_z: this.tfsZ,
                top_k: this.topK,
                top_p: this.topP,
                min_p: this.minP,
                typical_p: this.typicalP,
                use_mlock: this.useMlock,
                use_mmap: this.useMMap,
                vocab_only: this.vocabOnly,
                seed: this.seed,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: options?.tools?.length
                ? options.tools.map((tool) => convertToOpenAITool(tool))
                : undefined,
        }
    }

    _combineLLMOutput() {
        return {}
    }

    async _generate(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        let finalChunk: AIMessageChunk | undefined
        for await (const chunk of this._streamResponseChunks(
            messages,
            options,
            runManager
        )) {
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
            generations: [
                {
                    text:
                        typeof nonChunkMessage.content === "string"
                            ? nonChunkMessage.content
                            : "",
                    message: nonChunkMessage,
                },
            ],
        }
    }

    /** @deprecated */
    async *_streamResponseChunksLegacy(
        input: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const stream = createOllamaGenerateStream(
            this.baseUrl,
            {
                ...this.invocationParams(options),
                prompt: this._formatMessagesAsPrompt(input),
            },
            {
                ...options,
                headers: this.headers,
            }
        )
        for await (const chunk of stream) {
            if (!chunk.done) {
                yield new ChatGenerationChunk({
                    text: chunk.response,
                    message: new AIMessageChunk({ content: chunk.response }),
                })
                await runManager?.handleLLMNewToken(chunk.response ?? "")
            } else {
                yield new ChatGenerationChunk({
                    text: "",
                    message: new AIMessageChunk({ content: "" }),
                    generationInfo: {
                        model: chunk.model,
                        total_duration: chunk.total_duration,
                        load_duration: chunk.load_duration,
                        prompt_eval_count: chunk.prompt_eval_count,
                        prompt_eval_duration: chunk.prompt_eval_duration,
                        eval_count: chunk.eval_count,
                        eval_duration: chunk.eval_duration,
                    },
                })
            }
        }
    }

    async *_streamResponseChunks(
        input: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        try {
            const stream = await this.caller.call(async () =>
                createOllamaChatStream(
                    this.baseUrl,
                    {
                        ...this.invocationParams(options),
                        messages: this._convertMessagesToOllamaMessages(input),
                    },
                    {
                        ...options,
                        headers: this.headers,
                    }
                )
            )
            for await (const chunk of stream) {
                if (!chunk.done) {
                    const responseMessage = chunk.message

                    // Build tool_call_chunks if Ollama returned tool calls
                    const toolCallChunks = responseMessage.tool_calls?.map(
                        (tc, i) => ({
                            name: tc.function.name,
                            args: JSON.stringify(tc.function.arguments),
                            type: "tool_call_chunk" as const,
                            index: i,
                            id: crypto.randomUUID(),
                        })
                    )

                    const content = responseMessage.content ?? ""

                    yield new ChatGenerationChunk({
                        text: content,
                        message: new AIMessageChunk({
                            content,
                            additional_kwargs: responseMessage?.thinking
                                ? { reasoning_content: responseMessage.thinking }
                                : {},
                            tool_call_chunks: toolCallChunks,
                        }),
                    })
                    await runManager?.handleLLMNewToken(content)
                } else {
                    yield new ChatGenerationChunk({
                        text: "",
                        message: new AIMessageChunk({ content: "" }),
                        generationInfo: {
                            model: chunk.model,
                            total_duration: chunk.total_duration,
                            load_duration: chunk.load_duration,
                            prompt_eval_count: chunk.prompt_eval_count,
                            prompt_eval_duration: chunk.prompt_eval_duration,
                            eval_count: chunk.eval_count,
                            eval_duration: chunk.eval_duration,
                        },
                    })
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            if (e.response?.status === 404) {
                console.warn(
                    "[WARNING]: It seems you are using a legacy version of Ollama. Please upgrade to a newer version for better chat support."
                )
                yield* this._streamResponseChunksLegacy(input, options, runManager)
            } else {
                throw e
            }
        }
    }

    protected _convertMessagesToOllamaMessages(
        messages: BaseMessage[]
    ): OllamaMessage[] {
        return messages.map((message) => {
            let role: string
            if (message._getType() === "human") {
                role = "user"
            } else if (message._getType() === "ai") {
                role = "assistant"
            } else if (message._getType() === "system") {
                role = "system"
            } else if (message._getType() === "tool") {
                role = "tool"
            } else {
                throw new Error(
                    `Unsupported message type for Ollama: ${message._getType()}`
                )
            }

            // Handle ToolMessage
            if (message._getType() === "tool") {
                const toolMsg = message as ToolMessage
                return {
                    role: "tool",
                    content:
                        typeof toolMsg.content === "string" ? toolMsg.content : "",
                }
            }

            // Handle AI message with tool calls
            if (message._getType() === "ai") {
                const aiMsg = message as AIMessage
                if (aiMsg.tool_calls?.length) {
                    return {
                        role: "assistant",
                        content:
                            typeof aiMsg.content === "string" ? aiMsg.content : "",
                        tool_calls: aiMsg.tool_calls.map((tc) => ({
                            function: {
                                name: tc.name,
                                arguments: tc.args,
                            },
                        })),
                    }
                }
            }

            let content = ""
            const images: string[] = []
            if (typeof message.content === "string") {
                content = message.content
            } else {
                for (const contentPart of message.content) {
                    if (contentPart.type === "text") {
                        content = `${content}\n${contentPart.text}`
                    } else if (
                        contentPart.type === "image_url" &&
                        typeof contentPart.image_url === "string"
                    ) {
                        const imageUrlComponents = contentPart.image_url.split(",")
                        // Support both data:image/jpeg;base64,<image> format as well
                        images.push(imageUrlComponents[1] ?? imageUrlComponents[0])
                    } else {
                        throw new Error(
                            `Unsupported message content type. Must either have type "text" or type "image_url" with a string "image_url" field.`
                        )
                    }
                }
            }
            return {
                role,
                content,
                images,
            }
        })
    }

    /** @deprecated */
    protected _formatMessagesAsPrompt(messages: BaseMessage[]): string {
        const formattedMessages = messages
            .map((message) => {
                let messageText
                if (message._getType() === "human") {
                    messageText = `[INST] ${message.content} [/INST]`
                } else if (message._getType() === "ai") {
                    messageText = message.content
                } else if (message._getType() === "system") {
                    messageText = `<<SYS>> ${message.content} <</SYS>>`
                } else if (ChatMessage.isInstance(message)) {
                    messageText = `\n\n${message.role[0].toUpperCase()}${message.role.slice(
                        1
                    )}: ${message.content}`
                } else {
                    console.warn(
                        `Unsupported message type passed to Ollama: "${message._getType()}"`
                    )
                    messageText = ""
                }
                return messageText
            })
            .join("\n")
        return formattedMessages
    }
}
