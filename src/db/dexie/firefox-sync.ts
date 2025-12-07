import { bulkAddPromptsFB } from "../index"
import { bulkAddModelsFB } from "../models"
import { db } from "./schema"

export const firefoxSyncDataForPrivateMode = async () => {

  const allPrompts = await db.prompts.toArray()
  const customModels = await db.customModels.toArray()

  await bulkAddPromptsFB(allPrompts)
  await bulkAddModelsFB(customModels)
  // OpenAI configs are no longer synced; extension is tldw_server-only.
}
