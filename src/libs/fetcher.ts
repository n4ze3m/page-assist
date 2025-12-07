import { getCustomHeaders } from "@/services/app"


const fetcher = async (input: string | URL | globalThis.Request, init?: RequestInit) : Promise<Response> => {
    const update = {...init} || {}
    const customHdrs = await getCustomHeaders()
    update.headers = {
        ...customHdrs,
        ...update?.headers
    }
    return fetch(input, update)
}

export default fetcher