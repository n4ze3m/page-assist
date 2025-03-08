import { Storage } from "@plasmohq/storage"

export class ModelNickname {
    db: Storage
    private KEY = "modelNickname"

    constructor() {
        this.db = new Storage({
            area: "local"
        })
    }

    async saveModelNickname(
        model_id: string,
        model_name: string,
        model_avatar?: string
    ): Promise<void> {
        const modelNames = (await this.db.get(this.KEY)) || {}

        modelNames[model_id] = {
            model_name,
            ...(model_avatar && { model_avatar })
        }

        await this.db.set(this.KEY, modelNames)
    }

    async getModelNicknameByID(model_id: string) {
        const data = (await this.db.get(this.KEY)) || {}
        return data[model_id]
    }

    async getAllModelNicknames() {
        const data = (await this.db.get(this.KEY)) || {}
        return data
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


