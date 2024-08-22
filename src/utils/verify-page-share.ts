import { cleanUrl } from "~/libs/clean-url"
import fetcher from "@/libs/fetcher"

export const verifyPageShareURL = async (url: string) => {
    const res = await fetcher(`${cleanUrl(url)}/api/v1/ping`)
    if (!res.ok) {
        throw new Error("Unable to verify page share")
    }
    const data = await res.text()
    return data === "pong"
}