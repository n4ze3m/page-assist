export const preprocessLaTeX = (content: string) => {

    let processedContent = content.replace(
        /\\\[(.*?)\\\]/gs,
        (_, equation) => `$$${equation}$$`
    )

    processedContent = processedContent.replace(
        /\\\((.*?)\\\)/gs,
        (_, equation) => `$${equation}$`
    )

    processedContent = processedContent.replace(
        /\$(\d)/g,
        '\\$$1'
    )

    return processedContent
}
