import { cleanUrl } from "~/libs/clean-url"

export const verifyPageShareURL = async (url: string) => {
    const res = await fetch(`${cleanUrl(url)}/api/v1/ping`)
    if (!res.ok) {
        throw new Error("Unable to verify page share")
    }
    const data = await res.text()
    return data === "pong"
}