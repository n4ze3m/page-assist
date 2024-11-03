export const preprocessLaTeX = (content: string) => {
    let processedContent = content.replace(
        /\\\[([\s\S]*?)\\\]/g,
        (_, equation) => `$$${equation}$$`
    );
    processedContent = processedContent.replace(
        /\\\(([\s\S]*?)\\\)/g,
        (_, equation) => `$${equation}$`
    );
    processedContent = processedContent.replace(
        /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g,
        (_, equation) => `$$${equation}$$`
    );
    processedContent = processedContent.replace(
        /\\begin\{align\}([\s\S]*?)\\end\{align\}/g,
        (_, equation) => `$$\\begin{aligned}${equation}\\end{aligned}$$`
    );
    return processedContent;
}