import { getModelInfo, isCustomModel } from "@/db/dexie/models"
import { DynamicStorage } from "@/utils/storage"
const storage = new DynamicStorage()

export const getSelectedModelName = async (): Promise<string> => {
    const selectedModel = await storage.get("selectedModel")
    const isCustom = isCustomModel(selectedModel)
    if (isCustom) {
        const customModel = await getModelInfo(selectedModel)
        if (customModel) {
            return customModel.name
        } else {
            return selectedModel
        }
    }
    return selectedModel
}