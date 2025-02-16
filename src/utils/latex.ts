// Following code is copied from LibreChat by danny-avila 
// Github Repo: https://github.com/danny-avila/LibreChat
export const preprocessLaTeX = (content: string) => {
    const codeBlocks: string[] = [];
    content = content.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match, code) => {
        codeBlocks.push(code);
        return `<<CODE_BLOCK_${codeBlocks.length - 1}>>`;
    });

    const latexExpressions: string[] = [];
    content = content.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g, (match) => {
        latexExpressions.push(match);
        return `<<LATEX_${latexExpressions.length - 1}>>`;
    });
    content = content.replace(/\$(?=\d)/g, '\\$');

    content = content.replace(/<<LATEX_(\d+)>>/g, (_, index) => latexExpressions[parseInt(index)]);

    content = content.replace(/<<CODE_BLOCK_(\d+)>>/g, (_, index) => codeBlocks[parseInt(index)]);

    content = escapeBrackets(content);
    content = escapeMhchem(content);

    return content;
}


export function escapeBrackets(text: string): string {
    const pattern = /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g;
    return text.replace(
        pattern,
        (
            match: string,
            codeBlock: string | undefined,
            squareBracket: string | undefined,
            roundBracket: string | undefined,
        ): string => {
            if (codeBlock != null) {
                return codeBlock;
            } else if (squareBracket != null) {
                return `$$${squareBracket}$$`;
            } else if (roundBracket != null) {
                return `$${roundBracket}$`;
            }
            return match;
        },
    );
}

export function escapeMhchem(text: string) {
    return text.replaceAll('$\\ce{', '$\\\\ce{').replaceAll('$\\pu{', '$\\\\pu{');
}