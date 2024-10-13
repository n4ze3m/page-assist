export type OpenAICoreRequestOptions<
    Req extends object = Record<string, unknown>
> = {
    path?: string;
    query?: Req | undefined;
    body?: Req | undefined;
    headers?: Record<string, string | null | undefined> | undefined;

    maxRetries?: number;
    stream?: boolean | undefined;
    timeout?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    httpAgent?: any;
    signal?: AbortSignal | undefined | null;
    idempotencyKey?: string;
};

export interface LegacyOpenAIInput {
    /** @deprecated Use baseURL instead */
    basePath?: string;
    /** @deprecated Use defaultHeaders and defaultQuery instead */
    baseOptions?: {
        headers?: Record<string, string>;
        params?: Record<string, string>;
    };
}
