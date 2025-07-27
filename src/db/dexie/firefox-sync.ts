import { bulkAddPromptsFB } from "../index"
import { bulkAddModelsFB } from "../models"
import { bulkAddOAIFB } from "../openai"
import { db } from "./schema"

export const firefoxSyncDataForPrivateMode = async () => {

  const allPrompts = await db.prompts.toArray()
  const customModels = await db.customModels.toArray()
  const oaiConfigs = await db.openaiConfigs.toArray()

  await bulkAddPromptsFB(allPrompts)
  await bulkAddModelsFB(customModels)
  await bulkAddOAIFB(oaiConfigs)
}
