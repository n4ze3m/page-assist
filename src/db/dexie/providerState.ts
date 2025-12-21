import { db } from "./schema"
import { ProviderState, ProviderStates } from "./types"

export class ProviderStateDb {
  async getProviderState(provider_id: string): Promise<ProviderState | undefined> {
    return await db.providerState.get(provider_id)
  }

  async getAllProviderStates(): Promise<ProviderStates> {
    return await db.providerState.toArray()
  }

  async setProviderState(provider_id: string, is_enabled: boolean): Promise<void> {
    await db.providerState.put({
      id: provider_id,
      provider_id,
      is_enabled
    })
  }

  async deleteProviderState(provider_id: string): Promise<void> {
    await db.providerState.delete(provider_id)
  }

  async importDataV2(
    data: ProviderStates,
    options: {
      replaceExisting?: boolean
      mergeData?: boolean
    } = {}
  ): Promise<void> {
    const { replaceExisting = false, mergeData = true } = options

    for (const state of data) {
      const existingState = await this.getProviderState(state.provider_id)

      if (existingState && !replaceExisting) {
        if (mergeData) {
          await this.setProviderState(state.provider_id, state.is_enabled)
        }
        continue
      }

      await this.setProviderState(state.provider_id, state.is_enabled)
    }
  }
}

export const getProviderState = async (
  provider_id: string
): Promise<boolean> => {
  try {
    const providerStateDb = new ProviderStateDb()
    const state = await providerStateDb.getProviderState(provider_id)
    // If no state exists, provider is enabled by default
    return state?.is_enabled ?? true
  } catch (e) {
    console.error("Error getting provider state", e)
    // Default to enabled if error
    return true
  }
}

export const setProviderState = async (
  provider_id: string,
  is_enabled: boolean
): Promise<void> => {
  try {
    const providerStateDb = new ProviderStateDb()
    await providerStateDb.setProviderState(provider_id, is_enabled)
  } catch (e) {
    console.error("Error setting provider state", e)
  }
}

export const toggleProviderState = async (
  provider_id: string
): Promise<boolean> => {
  try {
    const currentState = await getProviderState(provider_id)
    const newState = !currentState
    await setProviderState(provider_id, newState)
    return newState
  } catch (e) {
    console.error("Error toggling provider state", e)
    return true
  }
}

export const getAllProviderStates = async (): Promise<Record<string, boolean>> => {
  try {
    const providerStateDb = new ProviderStateDb()
    const states = await providerStateDb.getAllProviderStates()
    const result: Record<string, boolean> = {}
    for (const state of states) {
      result[state.provider_id] = state.is_enabled
    }
    return result
  } catch (e) {
    console.error("Error getting all provider states", e)
    return {}
  }
}
