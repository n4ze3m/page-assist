export const getCustomHeaders = ({
    headers
}: {
    headers?: { key: string; value: string }[]
}) => {
    try {
        if (!headers) return {}
        if (typeof headers === "object") {
            return {}
        }
        const customHeaders: Record<string, string> = {}
        //@ts-ignore
        for (const header of headers) {
            customHeaders[header.key] = header.value
        }
        return customHeaders
    } catch (e) {
        return {}
    }
}
