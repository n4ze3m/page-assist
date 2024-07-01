import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings"
import type { StringWithAutocomplete } from "@langchain/core/utils/types"
import { parseKeepAlive } from "./utils/ollama"
import { getCustomOllamaHeaders } from "@/services/app"

export interface OllamaInput {
  embeddingOnly?: boolean
  f16KV?: boolean
  frequencyPenalty?: number
  headers?: Record<string, string>
  keepAlive?: any
  logitsAll?: boolean
  lowVram?: boolean
  mainGpu?: number
  model?: string
  baseUrl?: string
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
  typicalP?: number
  useMLock?: boolean
  useMMap?: boolean
  vocabOnly?: boolean
  format?: StringWithAutocomplete<"json">
}
export interface OllamaRequestParams {
  model: string
  format?: StringWithAutocomplete<"json">
  images?: string[]
  options: {
    embedding_only?: boolean
    f16_kv?: boolean
    frequency_penalty?: number
    logits_all?: boolean
    low_vram?: boolean
    main_gpu?: number
    mirostat?: number
    mirostat_eta?: number
    mirostat_tau?: number
    num_batch?: number
    num_ctx?: number
    num_gpu?: number
    num_gqa?: number
    num_keep?: number
    num_thread?: number
    num_predict?: number
    penalize_newline?: boolean
    presence_penalty?: number
    repeat_last_n?: number
    repeat_penalty?: number
    rope_frequency_base?: number
    rope_frequency_scale?: number
    temperature?: number
    stop?: string[]
    tfs_z?: number
    top_k?: number
    top_p?: number
    typical_p?: number
    use_mlock?: boolean
    use_mmap?: boolean
    vocab_only?: boolean
  }
}

type CamelCasedRequestOptions = Omit<
  OllamaInput,
  "baseUrl" | "model" | "format" | "headers"
>

/**
 * Interface for OllamaEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the OllamaEmbeddings class.
 */
interface OllamaEmbeddingsParams extends EmbeddingsParams {
  /** The Ollama model to use, e.g: "llama2:13b" */
  model?: string

  /** Base URL of the Ollama server, defaults to "http://localhost:11434" */
  baseUrl?: string

  /** Extra headers to include in the Ollama API request */
  headers?: Record<string, string>

  /** Defaults to "5m" */
  keepAlive?: any

  /** Advanced Ollama API request parameters in camelCase, see
   * https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values
   * for details of the available parameters.
   */
  requestOptions?: CamelCasedRequestOptions

  signal?: AbortSignal
}

export class OllamaEmbeddingsPageAssist extends Embeddings {
  model = "llama2"

  baseUrl = "http://localhost:11434"

  headers?: Record<string, string>

  keepAlive = "5m"

  requestOptions?: OllamaRequestParams["options"]

  signal?: AbortSignal

  constructor(params?: OllamaEmbeddingsParams) {
    super({ maxConcurrency: 1, ...params })

    if (params?.model) {
      this.model = params.model
    }

    if (params?.baseUrl) {
      this.baseUrl = params.baseUrl
    }

    if (params?.headers) {
      this.headers = params.headers
    }

    if (params?.keepAlive) {
      this.keepAlive = parseKeepAlive(params.keepAlive)
    }

    if (params?.requestOptions) {
      this.requestOptions = this._convertOptions(params.requestOptions)
    }

    if (params?.signal) {
      this.signal = params.signal
    }
  }

  /** convert camelCased Ollama request options like "useMMap" to
   * the snake_cased equivalent which the ollama API actually uses.
   * Used only for consistency with the llms/Ollama and chatModels/Ollama classes
   */
  _convertOptions(requestOptions: CamelCasedRequestOptions) {
    const snakeCasedOptions: Record<string, unknown> = {}
    const mapping: Record<keyof CamelCasedRequestOptions, string> = {
      embeddingOnly: "embedding_only",
      f16KV: "f16_kv",
      frequencyPenalty: "frequency_penalty",
      keepAlive: "keep_alive",
      logitsAll: "logits_all",
      lowVram: "low_vram",
      mainGpu: "main_gpu",
      mirostat: "mirostat",
      mirostatEta: "mirostat_eta",
      mirostatTau: "mirostat_tau",
      numBatch: "num_batch",
      numCtx: "num_ctx",
      numGpu: "num_gpu",
      numGqa: "num_gqa",
      numKeep: "num_keep",
      numPredict: "num_predict",
      numThread: "num_thread",
      penalizeNewline: "penalize_newline",
      presencePenalty: "presence_penalty",
      repeatLastN: "repeat_last_n",
      repeatPenalty: "repeat_penalty",
      ropeFrequencyBase: "rope_frequency_base",
      ropeFrequencyScale: "rope_frequency_scale",
      temperature: "temperature",
      stop: "stop",
      tfsZ: "tfs_z",
      topK: "top_k",
      topP: "top_p",
      typicalP: "typical_p",
      useMLock: "use_mlock",
      useMMap: "use_mmap",
      vocabOnly: "vocab_only"
    }

    for (const [key, value] of Object.entries(requestOptions)) {
      const snakeCasedOption = mapping[key as keyof CamelCasedRequestOptions]
      if (snakeCasedOption) {
        snakeCasedOptions[snakeCasedOption] = value
      }
    }
    return snakeCasedOptions
  }

  async _request(prompt: string): Promise<number[]> {
    const { model, baseUrl, keepAlive, requestOptions } = this

    let formattedBaseUrl = baseUrl
    if (formattedBaseUrl.startsWith("http://localhost:")) {
      // Node 18 has issues with resolving "localhost"
      // See https://github.com/node-fetch/node-fetch/issues/1624
      formattedBaseUrl = formattedBaseUrl.replace(
        "http://localhost:",
        "http://127.0.0.1:"
      )
    }
    const customHeaders = await getCustomOllamaHeaders()

    const response = await fetch(`${formattedBaseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
        ...customHeaders
      },
      body: JSON.stringify({
        prompt,
        model,
        keep_alive: keepAlive,
        options: requestOptions
      }),
      signal: this.signal
    })
    if (!response.ok) {
      throw new Error(
        `Request to Ollama server failed: ${response.status} ${response.statusText}`
      )
    }

    const json = await response.json()
    return json.embedding
  }

  async _embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = await Promise.all(
      texts.map((text) => this.caller.call(() => this._request(text)))
    )

    return embeddings
  }

  async embedDocuments(documents: string[]) {
    return this._embed(documents)
  }

  async embedQuery(document: string) {
    return (await this.embedDocuments([document]))[0]
  }
}
