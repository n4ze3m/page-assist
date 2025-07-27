import { db } from "./schema"
import { ModelNicknames, ModelNickname as MNick } from "./types"

export class ModelNickname {
  async saveModelNickname(
    id: string,
    model_name: string,
    model_avatar?: string
  ): Promise<void> {
    await db.modelNickname.put({
      id,
      model_name,
      model_id: id,
      model_avatar
    })
    console.log({
      id,
      model_name,
      model_id: id,
      model_avatar
    })
  }

  async getModelNicknameByID(model_id: string) {
    return await db.modelNickname.get(model_id)
  }

  async getAllModelNicknames() {
    return await db.modelNickname.reverse().toArray()
  }

  async importDataV2(
    data: ModelNicknames,
    options: {
      replaceExisting?: boolean
      mergeData?: boolean
    } = {}
  ): Promise<void> {
    const { replaceExisting = false, mergeData = true } = options

    for (const oai of data) {
      console.log("Saving x")

      await db.modelNickname.put({
        id: oai.model_id,
        model_id: oai.model_id,
        model_name: oai.model_name,
        model_avatar: oai.model_avatar
      })
    }
  }
}

export const getAllModelNicknames = async () => {
  try {
    const modelNickname = new ModelNickname()
    const data = await modelNickname.getAllModelNicknames()
    const result: Record<string, MNick> = {}
    for (const d of data) {
      result[d.model_id] = d
    }
    return result
  } catch (e) {
    console.error("Firefox Private Mode Error", e)
    return {}
  }
}

export const getModelNicknameByID = async (
  model_id: string
): Promise<{ model_name: string; model_avatar?: string } | null> => {
  try {
    const modelNickname = new ModelNickname()
    return await modelNickname.getModelNicknameByID(model_id)
  } catch (e) {
    return null
  }
}

export const saveModelNickname = async ({
  model_id,
  model_name,
  model_avatar
}: {
  model_id: string
  model_name: string
  model_avatar?: string
}) => {
  const modelNickname = new ModelNickname()
  return await modelNickname.saveModelNickname(
    model_id,
    model_name,
    model_avatar
  )
}
