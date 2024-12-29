// inspired from https://github.com/open-webui/open-webui/blob/2299f4843003759290cc6bf823595c6578ee4470/src/lib/utils/index.ts

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

export const sanitizeEmojis = (text: string): string => {
    const EMOJI_PATTERN = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g;
    return text.replace(EMOJI_PATTERN, '');
};

export const sanitizeMarkdown = (text: string): string => {
    return text
        .replace(/(```[\s\S]*?```)/g, '')
        .replace(/^\|.*\|$/gm, '')
        .replace(/(?:\*\*|__)(.*?)(?:\*\*|__)/g, '$1')
        .replace(/(?:[*_])(.*?)(?:[*_])/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!?\[([^\]]*)\](?:\([^)]+\)|\[[^\]]*\])/g, '$1')
        .replace(/^\[[^\]]+\]:\s*.*$/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*(?:\d+\.)\s+/gm, '')
        .replace(/^\s*>[> ]*/gm, '')
        .replace(/^\s*:\s+/gm, '')
        .replace(/\[\^[^\]]*\]/g, '')
        .replace(/[-*_~]/g, '')
        .replace(/\n{2,}/g, '\n');
};

export const sanitizeText = (content: string): string => {
    return sanitizeMarkdown(sanitizeEmojis(content.trim()));
};

export const parseTextIntoSentences = (text: string): string[] => {
    const codeBlocks: string[] = [];
    let blockIndex = 0;

    const processedText = text.replace(CODE_BLOCK_PATTERN, (match) => {
        const placeholder = `\u0000${blockIndex}\u0000`;
        codeBlocks[blockIndex++] = match;
        return placeholder;
    });

    const sentences = processedText.split(/(?<=[.!?])\s+/);

    return sentences
        .map(sentence =>
            sentence.replace(/\u0000(\d+)\u0000/g, (_, idx) => codeBlocks[idx])
        )
        .map(sanitizeText)
        .filter(Boolean);
};

export const parseTextIntoParagraphs = (text: string): string[] => {
    const codeBlocks: string[] = [];
    let blockIndex = 0;

    const processedText = text.replace(CODE_BLOCK_PATTERN, (match) => {
        const placeholder = `\u0000${blockIndex}\u0000`;
        codeBlocks[blockIndex++] = match;
        return placeholder;
    });

    return processedText
        .split(/\n+/)
        .map(paragraph =>
            paragraph.replace(/\u0000(\d+)\u0000/g, (_, idx) => codeBlocks[idx])
        )
        .map(sanitizeText)
        .filter(Boolean);
};

export const optimizeSentencesForSpeech = (text: string): string[] => {
    return parseTextIntoSentences(text).reduce((optimizedTexts, currentText) => {
        const lastIndex = optimizedTexts.length - 1;

        if (lastIndex >= 0) {
            const previousText = optimizedTexts[lastIndex];
            const wordCount = previousText.split(/\s+/).length;
            const charCount = previousText.length;

            if (wordCount < 4 || charCount < 50) {
                optimizedTexts[lastIndex] = `${previousText} ${currentText}`;
            } else {
                optimizedTexts.push(currentText);
            }
        } else {
            optimizedTexts.push(currentText);
        }

        return optimizedTexts;
    }, [] as string[]);
};

export const splitMessageContent = (content: string, splitBy: string = 'punctuation') => {
    const messageContentParts: string[] = [];

    switch (splitBy) {
        case 'punctuation':
            messageContentParts.push(...optimizeSentencesForSpeech(content));
            break;
        case 'paragraph':
            messageContentParts.push(...parseTextIntoParagraphs(content));
            break;
        case 'none':
            messageContentParts.push(sanitizeText(content));
            break;
        default:
    }

    return messageContentParts;
};