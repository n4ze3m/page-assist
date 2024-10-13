import { type ClientOptions, OpenAI as OpenAIClient } from "openai"
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings"
import { chunkArray } from "@langchain/core/utils/chunk_array"
import { OpenAICoreRequestOptions, LegacyOpenAIInput } from "./types"
import { wrapOpenAIClientError } from "./utils/openai"

export interface OpenAIEmbeddingsParams extends EmbeddingsParams {
    modelName: string
    model: string
    dimensions?: number
    timeout?: number
    batchSize?: number
    stripNewLines?: boolean
    signal?: AbortSignal
}

export class OAIEmbedding
    extends Embeddings {
    modelName = "text-embedding-ada-002"

    model = "text-embedding-ada-002"

    batchSize = 512

    // TODO: Update to `false` on next minor release (see: https://github.com/langchain-ai/langchainjs/pull/3612)
    stripNewLines = true

    /**
     * The number of dimensions the resulting output embeddings should have.
     * Only supported in `text-embedding-3` and later models.
     */
    dimensions?: number

    timeout?: number

    azureOpenAIApiVersion?: string

    azureOpenAIApiKey?: string

    azureADTokenProvider?: () => Promise<string>

    azureOpenAIApiInstanceName?: string

    azureOpenAIApiDeploymentName?: string

    azureOpenAIBasePath?: string

    organization?: string

    protected client: OpenAIClient

    protected clientConfig: ClientOptions

    signal?: AbortSignal

    constructor(
        fields?: Partial<OpenAIEmbeddingsParams> & {
            verbose?: boolean
            /**
             * The OpenAI API key to use.
             * Alias for `apiKey`.
             */
            openAIApiKey?: string
            /** The OpenAI API key to use. */
            apiKey?: string
            configuration?: ClientOptions
        },
        configuration?: ClientOptions & LegacyOpenAIInput
    ) {
        const fieldsWithDefaults = { maxConcurrency: 2, ...fields }

        super(fieldsWithDefaults)

        let apiKey = fieldsWithDefaults?.apiKey ?? fieldsWithDefaults?.openAIApiKey

        this.modelName =
            fieldsWithDefaults?.model ?? fieldsWithDefaults?.modelName ?? this.model
        this.model = this.modelName
        this.batchSize = fieldsWithDefaults?.batchSize || this.batchSize
        this.stripNewLines = fieldsWithDefaults?.stripNewLines ?? this.stripNewLines
        this.timeout = fieldsWithDefaults?.timeout
        this.dimensions = fieldsWithDefaults?.dimensions

        if (fields.signal) {
            this.signal = fields.signal
        }


        this.clientConfig = {
            apiKey,
            organization: this.organization,
            baseURL: configuration?.basePath,
            dangerouslyAllowBrowser: true,
            defaultHeaders: configuration?.baseOptions?.headers,
            defaultQuery: configuration?.baseOptions?.params,
            ...configuration,
            ...fields?.configuration
        }


        // initialize the client
        this.client = new OpenAIClient(this.clientConfig)
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const batches = chunkArray(
            this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts,
            this.batchSize
        )

        const batchRequests = batches.map((batch) => {
            const params: OpenAIClient.EmbeddingCreateParams = {
                model: this.model,
                input: batch
            }
            if (this.dimensions) {
                params.dimensions = this.dimensions
            }
            return this.embeddingWithRetry(params)
        })
        const batchResponses = await Promise.all(batchRequests)

        const embeddings: number[][] = []
        for (let i = 0; i < batchResponses.length; i += 1) {
            const batch = batches[i]
            const { data: batchResponse } = batchResponses[i]
            for (let j = 0; j < batch.length; j += 1) {
                embeddings.push(batchResponse[j].embedding)
            }
        }
        return embeddings
    }

    async embedQuery(text: string): Promise<number[]> {
        const params: OpenAIClient.EmbeddingCreateParams = {
            model: this.model,
            input: this.stripNewLines ? text.replace(/\n/g, " ") : text
        }
        if (this.dimensions) {
            params.dimensions = this.dimensions
        }
        const { data } = await this.embeddingWithRetry(params)
        return data[0].embedding
    }

    async _embed(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = await Promise.all(
            texts.map((text) => this.caller.call(() => this.embedQuery(text)))
        )

        return embeddings
    }


    protected async embeddingWithRetry(
        request: OpenAIClient.EmbeddingCreateParams
    ) {

        const requestOptions: OpenAICoreRequestOptions = {}
        if (this.azureOpenAIApiKey) {
            requestOptions.headers = {
                "api-key": this.azureOpenAIApiKey,
                ...requestOptions.headers
            }
            requestOptions.query = {
                "api-version": this.azureOpenAIApiVersion,
                ...requestOptions.query
            }
        }
        return this.caller.call(async () => {
            try {
                const res = await this.client.embeddings.create(request, {
                    ...requestOptions,
                    signal: this.signal
                })
                return res
            } catch (e) {
                const error = wrapOpenAIClientError(e)
                throw error
            }
        })
    }
}
