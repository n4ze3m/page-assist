export class ModelNickname {
    db: chrome.storage.StorageArea
    private KEY = "modelNickname"

    constructor() {
        this.db = chrome.storage.local
    }

    async saveModelNickname(
        model_id: string,
        model_name: string,
        model_avatar?: string
    ): Promise<void> {
        const data = (await this.db.get(this.KEY)) || {}
        const modelNames = data[this.KEY] || {}

        modelNames[model_id] = {
            model_name,
            ...(model_avatar && { model_avatar })
        }

        await this.db.set({ [this.KEY]: modelNames })
    }

    async getModelNicknameByID(model_id: string) {
        const data = (await this.db.get(this.KEY)) || {}
        const modelNames = data[this.KEY] || {}
        return modelNames[model_id]
    }

    async getAllModelNicknames() {
        const data = (await this.db.get(this.KEY)) || {}
        const modelNames = data[this.KEY] || {}
        return modelNames
    }
}

export const getAllModelNicknames = async () => {
    const modelNickname = new ModelNickname()
    return await modelNickname.getAllModelNicknames()
}

export const getModelNicknameByID = async (
    model_id: string
): Promise<{ model_name: string; model_avatar?: string } | null> => {
    const modelNickname = new ModelNickname()
    return await modelNickname.getModelNicknameByID(model_id)
}


export const saveModelNickname = async (
    {
        model_id,
        model_name,
        model_avatar
    }: {
        model_id: string,
        model_name: string,
        model_avatar?: string
    }
) => {
    const modelNickname = new ModelNickname()
    return await modelNickname.saveModelNickname(model_id, model_name, model_avatar)
}


