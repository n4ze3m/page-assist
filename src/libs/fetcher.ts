import { getCustomOllamaHeaders } from "@/services/app"


const fetcher = async (input: string | URL | globalThis.Request, init?: RequestInit) : Promise<Response> => {
    const update = {...init} || {}
    const customHeaders = await getCustomOllamaHeaders()
    update.headers = {
        ...customHeaders,
        ...update?.headers
    }
    return fetch(input, update)
}

export default fetcher