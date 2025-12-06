import { DynamicStorage } from "@/utils/storage"

const storage = new DynamicStorage()

export const isChatWithWebsiteEnabled = async (): Promise<boolean> => {
    const isChatWithWebsiteEnabled = await storage.get<boolean | undefined>(
        "chatWithWebsiteEmbedding"
    )
    return isChatWithWebsiteEnabled ?? false
}


export const getMaxContextSize = async (): Promise<number> => {
    const maxWebsiteContext = await storage.get<number | undefined>(
        "maxWebsiteContext"
    )
    return maxWebsiteContext ?? 7028
}