import type { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import {
    SimpleChatModel,
    type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
    AIMessageChunk,
    BaseMessage,
    ChatMessage,
} from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import type { StringWithAutocomplete } from "@langchain/core/utils/types";
import { McpManager } from '../mcp/McpManager';

import {
    createOllamaChatStream,
    createOllamaGenerateStream,
    parseKeepAlive,
    type OllamaInput,
    type OllamaMessage,
} from "./utils/ollama";

export interface ChatOllamaInput extends OllamaInput { }

export interface ChatOllamaCallOptions extends BaseLanguageModelCallOptions {
    tools?: any[];
    // Define the callbacks to pass status up to the caller
    onToolStart?: (tool: { name: string, arguments: any }) => Promise<void>;
    onToolEnd?: (tool: { name: string, arguments: any }, output: string) => Promise<void>;
    onToolError?: (tool: { name: string, arguments: any }, error: any) => Promise<void>;
}

export class ChatOllama
    extends SimpleChatModel<ChatOllamaCallOptions>
    implements ChatOllamaInput {
    static lc_name() {
        return "ChatOllama";
    }

    lc_serializable = true;

    model = "llama2";

    baseUrl = "http://localhost:11434";

    // keepAlive = "5m";

    keepAlive?: string;

    thinking?: boolean;

    embeddingOnly?: boolean;

    f16KV?: boolean;

    frequencyPenalty?: number;

    headers?: Record<string, string>;

    logitsAll?: boolean;

    lowVram?: boolean;

    mainGpu?: number;

    mirostat?: number;

    mirostatEta?: number;

    mirostatTau?: number;

    numBatch?: number;

    numCtx?: number;

    numGpu?: number;

    numGqa?: number;

    numKeep?: number;

    numPredict?: number;

    numThread?: number;

    penalizeNewline?: boolean;

    presencePenalty?: number;

    repeatLastN?: number;

    repeatPenalty?: number;

    ropeFrequencyBase?: number;

    ropeFrequencyScale?: number;

    temperature?: number;

    stop?: string[];

    tfsZ?: number;

    topK?: number;

    topP?: number;

    minP?: number;

    typicalP?: number;

    useMLock?: boolean;

    useMMap?: boolean;

    useMlock?: boolean;

    vocabOnly?: boolean;

    seed?: number;

    format?: StringWithAutocomplete<"json">;

    private static toolSupportCache: { [model: string]: boolean } = {};

    constructor(fields: OllamaInput & BaseChatModelParams) {
        super(fields);
        this.model = fields.model ?? this.model;
        this.baseUrl = fields.baseUrl?.endsWith("/")
            ? fields.baseUrl.slice(0, -1)
            : fields.baseUrl ?? this.baseUrl;
        this.keepAlive = parseKeepAlive(fields.keepAlive);
        this.embeddingOnly = fields.embeddingOnly;
        this.f16KV = fields.f16KV;
        this.frequencyPenalty = fields.frequencyPenalty;
        this.headers = fields.headers;
        this.logitsAll = fields.logitsAll;
        this.lowVram = fields.lowVram;
        this.mainGpu = fields.mainGpu;
        this.mirostat = fields.mirostat;
        this.mirostatEta = fields.mirostatEta;
        this.mirostatTau = fields.mirostatTau;
        this.numBatch = fields.numBatch;
        this.numCtx = fields.numCtx;
        this.numGpu = fields.numGpu === null ? undefined : fields.numGpu;
        this.numGqa = fields.numGqa;
        this.numKeep = fields.numKeep;
        this.numPredict = fields.numPredict;
        this.numThread = fields.numThread;
        this.penalizeNewline = fields.penalizeNewline;
        this.presencePenalty = fields.presencePenalty;
        this.repeatLastN = fields.repeatLastN;
        this.repeatPenalty = fields.repeatPenalty;
        this.ropeFrequencyBase = fields.ropeFrequencyBase;
        this.ropeFrequencyScale = fields.ropeFrequencyScale;
        this.temperature = fields.temperature;
        this.stop = fields.stop;
        this.tfsZ = fields.tfsZ;
        this.topK = fields.topK;
        this.topP = fields.topP;
        this.minP = fields.minP;
        this.typicalP = fields.typicalP;
        this.useMLock = fields.useMLock;
        this.useMMap = fields.useMMap;
        this.useMlock = fields.useMlock;
        this.vocabOnly = fields.vocabOnly;
        this.format = fields.format;
        this.seed = fields.seed;
        this.thinking = fields.thinking;

        // No need to await this in constructor
        this.detectToolSupport();
    }

    private async detectToolSupport(): Promise<void> {
        if (ChatOllama.toolSupportCache[this.model] !== undefined) {
            return;
        }

        try {
            const testPayload = {
                model: this.model,
                messages: [{ role: 'user', content: 'Test' }],
                tools: [{ type: 'function', function: { name: 'test_tool', description: 'Test', parameters: { type: 'object', properties: {} } } }],
                options: {},
            };

            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.headers },
                body: JSON.stringify(testPayload),
            });
            
            if (!response.ok) {
                const errorBody = await response.json();
                if (errorBody.error && errorBody.error.includes("does not support tools")) {
                    console.log(`[ChatOllama] Model ${this.model} does not support tools (API error).`);
                    ChatOllama.toolSupportCache[this.model] = false;
                } else {
                    console.log(`[ChatOllama] Model ${this.model} might not support tools (unspecific API error).`);
                    ChatOllama.toolSupportCache[this.model] = false;
                }
            } else {
                 console.log(`[ChatOllama] Model ${this.model} supports tools.`);
                 ChatOllama.toolSupportCache[this.model] = true;
            }

        } catch (e: any) {
            console.error(`[ChatOllama] Error detecting tool support for ${this.model}:`, e);
            ChatOllama.toolSupportCache[this.model] = false;
        }
    }

    protected getLsParams(options: this["ParsedCallOptions"]) {
        const params = this.invocationParams(options);
        return {
            ls_provider: "ollama",
            ls_model_name: this.model,
            ls_model_type: "chat",
            ls_temperature: this.temperature ?? undefined,
            ls_stop: this.stop,
            ls_max_tokens: params.options.num_predict,
        };
    }

    _llmType() {
        return "ollama";
    }

    /**
     * A method that returns the parameters for an Ollama API call. It
     * includes model and options parameters.
     * @param options Optional parsed call options.
     * @returns An object containing the parameters for an Ollama API call.
     */
    invocationParams(options?: this["ParsedCallOptions"]) {
        const params = {
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
        };
        // @ts-ignore
        if (ChatOllama.toolSupportCache[this.model] && options?.tools) {
            // @ts-ignore
            params.tools = options.tools;
        }
        return params;
    }

    _combineLLMOutput() {
        return {};
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
        );
        for await (const chunk of stream) {
            if (!chunk.done) {
                yield new ChatGenerationChunk({
                    text: chunk.response,
                    message: new AIMessageChunk({ content: chunk.response }),
                });
                await runManager?.handleLLMNewToken(chunk.response ?? "");
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
                });
            }
        }
    }

    async *_streamResponseChunks(
        input: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        await this.detectToolSupport();

        if (!ChatOllama.toolSupportCache[this.model] && options?.tools?.length) {
            console.warn(`[ChatOllama] Model ${this.model} does not support tools, using legacy stream.`);
            yield* this._streamResponseChunksLegacy(input, options, runManager);
            return;
        }

        try {
            let messages = this._convertMessagesToOllamaMessages(input);
            let firstStreamFinished = false;

            while (!firstStreamFinished) {
                const payload = {
                    ...this.invocationParams(options),
                    messages,
                };
                
                const stream = await this.caller.call(async () =>
                    createOllamaChatStream(
                        this.baseUrl,
                        payload,
                        {
                            ...options,
                            headers: this.headers,
                        }
                    )
                );

                let toolCallOccurred = false;
                for await (const chunk of stream) {
                    if (chunk.message.tool_calls && chunk.message.tool_calls.length > 0) {
                        toolCallOccurred = true;
                        messages.push({
                            role: 'assistant',
                            content: chunk.message.content || '',
                            tool_calls: chunk.message.tool_calls,
                        });

                        for (const toolCall of chunk.message.tool_calls) {
                            if (options.onToolStart) {
                                await options.onToolStart(toolCall.function);
                            }
                            try {
                                const result = await McpManager.executeTool(
                                    toolCall.function.name,
                                    toolCall.function.arguments
                                );
                                let toolResponseText = '';
                                if (result && result.content && Array.isArray(result.content)) {
                                    const textContent = result.content.find((item: any) => item.type === 'text');
                                    toolResponseText = textContent?.text || JSON.stringify(result, null, 2);
                                } else {
                                    toolResponseText = JSON.stringify(result, null, 2);
                                }

                                if (options.onToolEnd) {
                                    await options.onToolEnd(toolCall.function, toolResponseText);
                                }

                                messages.push({
                                    role: 'tool',
                                    // @ts-ignore
                                    tool_call_id: toolCall.id,
                                    content: toolResponseText,
                                });

                            } catch (error: any) {
                                if (options.onToolError) {
                                    await options.onToolError(toolCall.function, error);
                                }
                                firstStreamFinished = true; 
                                break;
                            }
                        }
                        if (firstStreamFinished) break;
                    } else {
                        if (!chunk.done) {
                            yield new ChatGenerationChunk({
                                text: chunk.message.content,
                                message: new AIMessageChunk({
                                    content: chunk.message.content,
                                    additional_kwargs: chunk?.message?.thinking ? {
                                        reasoning_content: chunk?.message?.thinking
                                    } : undefined
                                }),
                            });
                            await runManager?.handleLLMNewToken(chunk.message.content ?? "");
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
                            });
                        }
                    }
                }
                
                if (!toolCallOccurred) {
                    firstStreamFinished = true;
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            if (e.response?.status === 400 && e.message.includes('does not support tools')) {
                console.warn(`[ChatOllama] Model ${this.model} does not support tools, using legacy stream.`);
                ChatOllama.toolSupportCache[this.model] = false;
                yield* this._streamResponseChunksLegacy(input, options, runManager);
            } else if (e.response?.status === 404) {
                console.warn("[ChatOllama] Legacy Ollama version detected, using legacy stream.");
                yield* this._streamResponseChunksLegacy(input, options, runManager);
            } else {
                console.error("[ChatOllama] Stream error:", e);
                throw e;
            }
        }
    }

    protected _convertMessagesToOllamaMessages(
        messages: BaseMessage[]
    ): OllamaMessage[] {
        // @ts-ignore
        return messages.map((message) => {
            let role;
            if (message._getType() === "human") {
                role = "user";
            } else if (message._getType() === "ai") {
                role = "assistant";
            } else if (message._getType() === "system") {
                role = "system";
            } else if (message._getType() === "tool") {
                role = "tool";
            } else {
                throw new Error(
                    `Unsupported message type for Ollama: ${message._getType()}`
                );
            }
            let content = "";
            const images = [];
            if (typeof message.content === "string") {
                content = message.content;
            } else {
                for (const contentPart of message.content) {
                    if (contentPart.type === "text") {
                        content = `${content}\n${contentPart.text}`;
                    } else if (
                        contentPart.type === "image_url" &&
                        typeof contentPart.image_url === "string"
                    ) {
                        const imageUrlComponents = contentPart.image_url.split(",");
                        // Support both data:image/jpeg;base64,<image> format as well
                        images.push(imageUrlComponents[1] ?? imageUrlComponents[0]);
                    } else {
                        throw new Error(
                            `Unsupported message content type. Must either have type "text" or type "image_url" with a string "image_url" field.`
                        );
                    }
                }
            }
            const ollamaMessage: OllamaMessage = {
                role,
                content,
                images,
            };
            // @ts-ignore
            if (message.tool_calls) {
                // @ts-ignore
                ollamaMessage.tool_calls = message.tool_calls;
            }
            // @ts-ignore
            if (message.tool_call_id) {
                // @ts-ignore
                ollamaMessage.tool_call_id = message.tool_call_id;
            }
            return ollamaMessage;
        });
    }

    /** @deprecated */
    protected _formatMessagesAsPrompt(messages: BaseMessage[]): string {
        const formattedMessages = messages
            .map((message) => {
                let messageText;
                if (message._getType() === "human") {
                    messageText = `[INST] ${message.content} [/INST]`;
                } else if (message._getType() === "ai") {
                    messageText = message.content;
                } else if (message._getType() === "system") {
                    messageText = `<<SYS>> ${message.content} <</SYS>>`;
                } else if (message._getType() === "tool") {
                    messageText = `Tool Response: ${message.content}`;
                } else if (ChatMessage.isInstance(message)) {
                    messageText = `\n\n${message.role[0].toUpperCase()}${message.role.slice(
                        1
                    )}: ${message.content}`;
                } else {
                    console.warn(
                        `Unsupported message type passed to Ollama: "${message._getType()}"`
                    );
                    messageText = "";
                }
                return messageText;
            })
            .join("\n");
        return formattedMessages;
    }

    /** @ignore */
    async _call(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        const chunks = [];
        for await (const chunk of this._streamResponseChunks(
            messages,
            options,
            runManager
        )) {
            chunks.push(chunk.message.content);
        }
        return chunks.join("");
    }
}