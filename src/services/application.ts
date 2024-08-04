import { Storage } from "@plasmohq/storage"
const storage = new Storage()

const DEFAULT_SUMMARY_PROMPT = `Provide a concise summary of the following text, capturing its main ideas and key points:

Text:
---------
{text}
---------

Summarize the text in no more than 3-4 sentences.

Response:`

const DEFAULT_REPHRASE_PROMPT = `Rewrite the following text in a different way, maintaining its original meaning but using alternative vocabulary and sentence structures:

Text:
---------
{text}
---------

Ensure that your rephrased version conveys the same information and intent as the original.

Response:`

const DEFAULT_TRANSLATE_PROMPT = `Translate the following text from its original language into "english". Maintain the tone and style of the original text as much as possible:

Text:
---------
{text}
---------

Response:`

const DEFAULT_EXPLAIN_PROMPT = `Provide a detailed explanation of the following text, breaking down its key concepts, implications, and context:

Text:
---------
{text}
---------

Your explanation should:

Clarify any complex terms or ideas
Provide relevant background information
Discuss the significance or implications of the content
Address any potential questions a reader might have
Use examples or analogies to illustrate points when appropriate

Aim for a comprehensive explanation that would help someone with little prior knowledge fully understand the text.

Response:`

const DEFAULT_CUSTOM_PROMPT = `{text}`

export const getSummaryPrompt = async () => {
    return (await storage.get("copilotSummaryPrompt")) || DEFAULT_SUMMARY_PROMPT
}

export const setSummaryPrompt = async (prompt: string) => {
    await storage.set("copilotSummaryPrompt", prompt)
}

export const getRephrasePrompt = async () => {
    return (await storage.get("copilotRephrasePrompt")) || DEFAULT_REPHRASE_PROMPT
}

export const setRephrasePrompt = async (prompt: string) => {
    await storage.set("copilotRephrasePrompt", prompt)
}

export const getTranslatePrompt = async () => {
    return (
        (await storage.get("copilotTranslatePrompt")) || DEFAULT_TRANSLATE_PROMPT
    )
}

export const setTranslatePrompt = async (prompt: string) => {
    await storage.set("copilotTranslatePrompt", prompt)
}

export const getExplainPrompt = async () => {
    return (await storage.get("copilotExplainPrompt")) || DEFAULT_EXPLAIN_PROMPT
}

export const setExplainPrompt = async (prompt: string) => {
    await storage.set("copilotExplainPrompt", prompt)
}

export const getCustomPrompt = async () => {
    return (await storage.get("copilotCustomPrompt")) || DEFAULT_CUSTOM_PROMPT
}

export const setCustomPrompt = async (prompt: string) => {
    await storage.set("copilotCustomPrompt", prompt)
}

export const getAllCopilotPrompts = async () => {
    const [
        summaryPrompt,
        rephrasePrompt,
        translatePrompt,
        explainPrompt,
        customPrompt
    ] = await Promise.all([
        getSummaryPrompt(),
        getRephrasePrompt(),
        getTranslatePrompt(),
        getExplainPrompt(),
        getCustomPrompt()
    ])

    return [
        { key: "summary", prompt: summaryPrompt },
        { key: "rephrase", prompt: rephrasePrompt },
        { key: "translate", prompt: translatePrompt },
        { key: "explain", prompt: explainPrompt },
        { key: "custom", prompt: customPrompt }
    ]
}

export const setAllCopilotPrompts = async (
    prompts: { key: string; prompt: string }[]
) => {
    for (const { key, prompt } of prompts) {
        switch (key) {
            case "summary":
                await setSummaryPrompt(prompt)
                break
            case "rephrase":
                await setRephrasePrompt(prompt)
                break
            case "translate":
                await setTranslatePrompt(prompt)
                break
            case "explain":
                await setExplainPrompt(prompt)
                break
            case "custom":
                await setCustomPrompt(prompt)
                break

        }
    }
}

export const getPrompt = async (key: string) => {
    switch (key) {
        case "summary":
            return await getSummaryPrompt()
        case "rephrase":
            return await getRephrasePrompt()
        case "translate":
            return await getTranslatePrompt()
        case "explain":
            return await getExplainPrompt()
        case "custom":
            return await getCustomPrompt()
        default:
            return ""
    }
}
