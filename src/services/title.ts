import { pageAssistModel } from "@/models"
import { Storage } from "@plasmohq/storage"
import { getOllamaURL } from "./ollama"
import { cleanUrl } from "@/libs/clean-url"
import { HumanMessage } from "langchain/schema"
import { removeReasoning } from "@/libs/reasoning"
const storage = new Storage()

// this prompt is copied from the OpenWebUI codebase
export const DEFAULT_TITLE_GEN_PROMPT = `Here is the query:

--------------

{{query}}

--------------

Create a concise, 3-5 word phrase as a title for the previous query. Avoid quotation marks or special formatting. RESPOND ONLY WITH THE TITLE TEXT. ANSWER USING THE SAME LANGUAGE AS THE QUERY.


Examples of titles:

Stellar Achievement Celebration
Family Bonding Activities
🇫🇷 Voyage à Paris
🍜 Receta de Ramen Casero
Shakespeare Analyse Literarische
日本の春祭り体験
Древнегреческая Философия Обзор

Response:`


export const isTitleGenEnabled = async () => {
    const enabled = await storage.get<boolean | undefined>("titleGenEnabled")
    return enabled ?? false
}

export const setTitleGenEnabled = async (enabled: boolean) => {
    await storage.set("titleGenEnabled", enabled)
}

export const getTitleGenerationPrompt = async () => {
    const title = await storage.get<string | undefined>("titleGenerationPrompt")
    return title ?? DEFAULT_TITLE_GEN_PROMPT
}


export const setTitleGenerationPrompt = async (prompt: string) => {
    await storage.set("titleGenerationPrompt", prompt)
}


export const titleGenerationModel = async () => {
    const model = await storage.get<string | undefined>("titleGenerationModel")
    return model
}

export const setTitleGenerationModel = async (model: string) => {
    await storage.set("titleGenerationModel", model)
}

export const generateTitle = async (model: string, query: string, fallBackTitle: string) => {

    const isEnabled = await isTitleGenEnabled()

    if (!isEnabled) {
        return fallBackTitle
    }

    try {
        const url = await getOllamaURL()


        const defaultTitleModel = await titleGenerationModel();
        const titleGenModel = defaultTitleModel || model

        const titleModel = await pageAssistModel({
            baseUrl: cleanUrl(url),
            model: titleGenModel
        })

        const titlePrompt = await getTitleGenerationPrompt()

        const prompt = titlePrompt.replace("{{query}}", query)

        const title = await titleModel.invoke([
            new HumanMessage({
                content: prompt
            })
        ])

        return removeReasoning(title.content.toString())
    } catch (error) {
        console.error(`Error generating title: ${error}`)
        return fallBackTitle
    }
}