import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export const isChatWithWebsiteEnabled = async (): Promise<boolean> => {
    const isChatWithWebsiteEnabled = await storage.get<boolean | undefined>(
        "chatWithWebsiteEmbedding"
    )
    return isChatWithWebsiteEnabled ?? true
}


export const getMaxContextSize = async (): Promise<number> => {
    const maxWebsiteContext = await storage.get<number | undefined>(
        "maxWebsiteContext"
    )
    return maxWebsiteContext ?? 4028
}