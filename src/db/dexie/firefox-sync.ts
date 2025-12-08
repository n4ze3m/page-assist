import { bulkAddPromptsFB } from "@/db/index"
import { bulkAddModelsFB } from "@/db/models"
import { db } from "@/db/dexie/schema"

export const firefoxSyncDataForPrivateMode = async () => {

  const allPrompts = await db.prompts.toArray()
  const customModels = await db.customModels.toArray()

  await bulkAddPromptsFB(allPrompts)
  await bulkAddModelsFB(customModels)
  // OpenAI configs are no longer synced; extension is tldw_server-only.
}
