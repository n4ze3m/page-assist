import { DynamicStorage } from "@/utils/storage"

const storage = new DynamicStorage()


export const getInitialConfig = async () => {
    const actionIconClickValue = await storage.get("actionIconClick")
    const contextMenuClickValue = await storage.get("contextMenuClick")

    let actionIconClick = actionIconClickValue || "webui"
    let contextMenuClick = contextMenuClickValue || "sidePanel"

    return {
        actionIconClick,
        contextMenuClick
    }

}

export const getActionIconClick = async () => {
    const actionIconClickValue = await storage.get("actionIconClick")
    return actionIconClickValue || "webui"
}
