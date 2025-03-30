export const getCustomHeaders = ({
    headers
}: {
    headers?: { key: string; value: string }[]
}) => {
    if (!headers) return {}

    const customHeaders: Record<string, string> = {}
    for (const header of headers) {
        customHeaders[header.key] = header.value
    }
    return customHeaders
}
