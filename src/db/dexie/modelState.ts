import { db } from "./schema"
import { ModelState, ModelStates } from "./types"

export class ModelStateDb {
  async getModelState(model_id: string): Promise<ModelState | undefined> {
    return await db.modelState.get(model_id)
  }

  async getAllModelStates(): Promise<ModelStates> {
    return await db.modelState.toArray()
  }

  async setModelState(model_id: string, is_enabled: boolean): Promise<void> {
    await db.modelState.put({
      id: model_id,
      model_id,
      is_enabled
    })
  }

  async deleteModelState(model_id: string): Promise<void> {
    await db.modelState.delete(model_id)
  }

  async importDataV2(
    data: ModelStates,
    options: {
      replaceExisting?: boolean
      mergeData?: boolean
    } = {}
  ): Promise<void> {
    const { replaceExisting = false, mergeData = true } = options

    for (const state of data) {
      const existingState = await this.getModelState(state.model_id)

      if (existingState && !replaceExisting) {
        if (mergeData) {
          await this.setModelState(state.model_id, state.is_enabled)
        }
        continue
      }

      await this.setModelState(state.model_id, state.is_enabled)
    }
  }
}

export const getModelState = async (
  model_id: string
): Promise<boolean> => {
  try {
    const modelStateDb = new ModelStateDb()
    const state = await modelStateDb.getModelState(model_id)
    // If no state exists, model is enabled by default
    return state?.is_enabled ?? true
  } catch (e) {
    console.error("Error getting model state", e)
    // Default to enabled if error
    return true
  }
}

export const setModelState = async (
  model_id: string,
  is_enabled: boolean
): Promise<void> => {
  try {
    const modelStateDb = new ModelStateDb()
    await modelStateDb.setModelState(model_id, is_enabled)
  } catch (e) {
    console.error("Error setting model state", e)
  }
}

export const toggleModelState = async (
  model_id: string
): Promise<boolean> => {
  try {
    const currentState = await getModelState(model_id)
    const newState = !currentState
    await setModelState(model_id, newState)
    return newState
  } catch (e) {
    console.error("Error toggling model state", e)
    return true
  }
}

export const getAllModelStates = async (): Promise<Record<string, boolean>> => {
  try {
    const modelStateDb = new ModelStateDb()
    const states = await modelStateDb.getAllModelStates()
    const result: Record<string, boolean> = {}
    for (const state of states) {
      result[state.model_id] = state.is_enabled
    }
    return result
  } catch (e) {
    console.error("Error getting all model states", e)
    return {}
  }
}
