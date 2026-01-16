import { getDefaultOcrLanguage } from "@/data/ocr-language"
import { useStoreChatModelSettings } from "@/store/model"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()


export const getOCRLanguage = async () => {
    const data = await storage.get<string | undefined | null>("defaultOCRLanguage")
    if (!data || data.length === 0) {
        return getDefaultOcrLanguage()
    }
    return data
}

export const getOCRLanguageToUse = async () => {
    const currentChatModelSettings = useStoreChatModelSettings.getState()
    if (currentChatModelSettings?.ocrLanguage) {
        return currentChatModelSettings.ocrLanguage
    }

    const defaultOCRLanguage = await getOCRLanguage()
    return defaultOCRLanguage
}


export const isOfflineOCR = (lang: string) => {
    return lang !== "eng-fast"
}