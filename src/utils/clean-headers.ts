export const getCustomHeaders = ({
    headers
}: {
    headers?: { key: string; value: string }[] | any
}) => {
    try {
        if (!headers) return {}
        //@ts-ignore
        if (headers == {}) return {}

        // Check if headers is actually an array
        if (!Array.isArray(headers)) return {}

        const customHeaders: Record<string, string> = {}
        for (const header of headers) {
            if (header && typeof header.key === 'string' && header.value !== undefined) {
                customHeaders[header.key] = header.value
            }
        }
        return customHeaders
    } catch (e) {
        console.error(e, headers)
        return {}
    }
}
