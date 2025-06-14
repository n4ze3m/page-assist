import { getLastUsedChatModel, getLastUsedChatSystemPrompt } from "@/services/model-settings"
import { PageAssitDatabase as ChromeDB } from "../index"
import { getAllKnowledge } from "../knowledge"
import { getAllVector,  } from "../vector"
import { PageAssistDatabase as DexieDB, } from "./chat"
import { PageAssistKnowledge as DexieDBK } from "./knowledge"
import { PageAssistVectorDb as DexieDBV } from "./vector"
import { OpenAIModelDb as DexieDBOAI } from "./openai"
import {ModelNickname as DexieDBNick} from "./nickname"
import { ModelDb as DexieDBM } from "./models"
import { getAllOpenAIConfig } from "../openai"
import { getAllModelsExT } from "../models"
import { getAllModelNicknamesMig } from "../nickname"
import { notification } from "antd"

export class DatabaseMigration {
  private chromeDB: ChromeDB
  private dexieDB: DexieDB
  private dexieDBK: DexieDBK
  private dexieDBV: DexieDBV
  private dexieDBOAI: DexieDBOAI
  private dexieDBM: DexieDBM
  private dexieNick: DexieDBNick

  constructor() {
    this.chromeDB = new ChromeDB()
    this.dexieDB = new DexieDB()
    this.dexieDBK = new DexieDBK()
    this.dexieDBV = new DexieDBV()
    this.dexieDBOAI = new DexieDBOAI()
    this.dexieDBM = new DexieDBM()
    this.dexieNick = new DexieDBNick()
  }

  async migrateAllData(): Promise<{
    success: boolean
    migratedCounts: {
      chatHistories: number
      messages: number
      prompts: number
      webshares: number
      sessionFiles: number
      userSettings: number
    }
    errors: string[]
  }> {
    const errors: string[] = []
    const migratedCounts = {
      chatHistories: 0,
      messages: 0,
      prompts: 0,
      webshares: 0,
      sessionFiles: 0,
      userSettings: 0,
      knowledge: 0,
      vector: 0,
    }

    try {
      // Migrate user settings
      try {
        const userId = await this.chromeDB.getUserID()
        if (userId && typeof userId === "string" && userId.trim() !== "") {
          await this.dexieDB.setUserID(userId)
          migratedCounts.userSettings = 1
        }
      } catch (error) {
        errors.push(`Failed to migrate user settings: ${error}`)
      }



      // Migrate chat histories and messages
      try {
        const chatHistories = await this.chromeDB.getChatHistories()
        for (const history of chatHistories) {
          try {

            const lastUsedModel = await getLastUsedChatModel(history.id)
            const lastUsedPrompt = await getLastUsedChatSystemPrompt(history.id)

            await this.dexieDB.addChatHistory({
              ...history,
              model_id: lastUsedModel,
              last_used_prompt: lastUsedPrompt,
            })
            migratedCounts.chatHistories++

            // Migrate messages for this history
            try {
              const messages = await this.chromeDB.getChatHistory(history.id)
              for (const message of messages) {
                try {
                  await this.dexieDB.addMessage(message)
                  migratedCounts.messages++
                } catch (msgError) {
                  errors.push(
                    `Failed to migrate message ${message.id}: ${msgError}`
                  )
                }
              }

            } catch (msgHistoryError) {
              errors.push(
                `Failed to get messages for history ${history.id}: ${msgHistoryError}`
              )
            }
          } catch (historyError) {
            errors.push(
              `Failed to migrate chat history ${history.id}: ${historyError}`
            )
          }
        }
        await this.chromeDB.deleteAllChatHistory()
      } catch (error) {
        errors.push(`Failed to migrate chat histories: ${error}`)
      }


      // Migrate knowledge
      try {
        const knowledges = await getAllKnowledge()
        await this.dexieDBK.importDataV2(knowledges)
      } catch (error) {
        errors.push(`Failed to migrate knowledge: ${error}`)
      }

      // Migrate OpenAI config
      try {
        const configs = await getAllOpenAIConfig()
        await this.dexieDBOAI.importDataV2(configs)
      } catch(error) {
        errors.push(`Failed to migrate OAI: ${error}`)
      }

      // Migrate Custom models

      try {
        const models = await getAllModelsExT()
        await this.dexieDBM.importDataV2(models)
      } catch(error) {
        errors.push(`Failed to migrate OAI: ${error}`)
      }

      // Migrate vector
      try {
        const vectors = await getAllVector()
        await this.dexieDBV.saveImportedDataV2(vectors)
      } catch (error) {
        errors.push(`Failed to migrate knowledge: ${error}`)
      }

     // Migrate nickname
      try {
        console.log("Saving Nickname")
        const nicknames = await getAllModelNicknamesMig()
        await this.dexieNick.importDataV2(nicknames)
      } catch (error) {
        errors.push(`Failed to migrate nick: ${error}`)
      }



      // Migrate prompts
      try {
        const prompts = await this.chromeDB.getAllPrompts()
        for (const prompt of prompts) {
          try {
            await this.dexieDB.addPrompt(prompt)
            migratedCounts.prompts++
          } catch (promptError) {
            errors.push(`Failed to migrate prompt ${prompt.id}: ${promptError}`)
          }
        }
      } catch (error) {
        errors.push(`Failed to migrate prompts: ${error}`)
      }

      // Migrate webshares
      try {
        const webshares = await this.chromeDB.getAllWebshares()
        for (const webshare of webshares) {
          try {
            await this.dexieDB.addWebshare(webshare)
            migratedCounts.webshares++
          } catch (webshareError) {
            errors.push(
              `Failed to migrate webshare ${webshare.id}: ${webshareError}`
            )
          }
        }
      } catch (error) {
        errors.push(`Failed to migrate webshares: ${error}`)
      }

      // Migrate session files - this is tricky since Chrome storage doesn't have a way to enumerate all keys
      // We'll need to handle this separately or ask the user to provide session IDs
      console.warn(
        "Session files migration requires manual handling of session IDs"
      )

      return {
        success: errors.length === 0,
        migratedCounts,
        errors
      }
    } catch (error) {
      errors.push(`General migration error: ${error}`)
      return {
        success: false,
        migratedCounts,
        errors
      }
    }
  }

  async migrateSessionFiles(sessionIds: string[]): Promise<{
    success: boolean
    migratedCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let migratedCount = 0

    for (const sessionId of sessionIds) {
      try {
        const sessionFiles = await this.chromeDB.getSessionFilesInfo(sessionId)
        if (sessionFiles) {
          await this.dexieDB.setRetrievalEnabled(
            sessionId,
            sessionFiles.retrievalEnabled
          )
          for (const file of sessionFiles.files) {
            await this.dexieDB.addFileToSession(sessionId, file)
          }
          migratedCount++
        }
      } catch (error) {
        errors.push(
          `Failed to migrate session files for ${sessionId}: ${error}`
        )
      }
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors
    }
  }

  async verifyMigration(): Promise<{
    isValid: boolean
    counts: {
      chrome: {
        chatHistories: number
        prompts: number
        webshares: number
      }
      dexie: {
        chatHistories: number
        prompts: number
        webshares: number
      }
    }
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // Count Chrome storage data
      const chromeChatHistories = await this.chromeDB.getChatHistories()
      const chromePrompts = await this.chromeDB.getAllPrompts()
      const chromeWebshares = await this.chromeDB.getAllWebshares()

      // Count Dexie data
      const dexieChatHistories = await this.dexieDB.getChatHistories()
      const dexiePrompts = await this.dexieDB.getAllPrompts()
      const dexieWebshares = await this.dexieDB.getAllWebshares()

      const counts = {
        chrome: {
          chatHistories: chromeChatHistories.length,
          prompts: chromePrompts.length,
          webshares: chromeWebshares.length
        },
        dexie: {
          chatHistories: dexieChatHistories.length,
          prompts: dexiePrompts.length,
          webshares: dexieWebshares.length
        }
      }

      // Check for discrepancies
      if (counts.chrome.chatHistories !== counts.dexie.chatHistories) {
        issues.push(
          `Chat histories count mismatch: Chrome(${counts.chrome.chatHistories}) vs Dexie(${counts.dexie.chatHistories})`
        )
      }

      if (counts.chrome.prompts !== counts.dexie.prompts) {
        issues.push(
          `Prompts count mismatch: Chrome(${counts.chrome.prompts}) vs Dexie(${counts.dexie.prompts})`
        )
      }

      if (counts.chrome.webshares !== counts.dexie.webshares) {
        issues.push(
          `Webshares count mismatch: Chrome(${counts.chrome.webshares}) vs Dexie(${counts.dexie.webshares})`
        )
      }

      return {
        isValid: issues.length === 0,
        counts,
        issues
      }
    } catch (error) {
      issues.push(`Verification failed: ${error}`)
      return {
        isValid: false,
        counts: {
          chrome: { chatHistories: 0, prompts: 0, webshares: 0 },
          dexie: { chatHistories: 0, prompts: 0, webshares: 0 }
        },
        issues
      }
    }
  }

  async clearDexieDatabase(): Promise<void> {
    await this.dexieDB.clear()
  }
}

export const runMigration = async (): Promise<void> => {
  const migration = new DatabaseMigration()

  console.log("Starting database migration...")
  const result = await migration.migrateAllData()

  if (result.success) {
    console.log("Migration completed successfully!")
    console.log("Migrated counts:", result.migratedCounts)
  } else {
    console.error("Migration completed with errors:")
    console.error("Errors:", result.errors)
    console.log("Partial migration counts:", result.migratedCounts)
  }

  // Verify migration
  console.log("Verifying migration...")
  const verification = await migration.verifyMigration()

  if (verification.isValid) {
    console.log("Migration verification passed!")
  } else {
    console.warn("Migration verification found issues:")
    console.warn(verification.issues)
  }

  console.log("Data counts:", verification.counts)
}

// Helper function to get all session IDs from Chrome storage
export const getAllSessionIds = async (): Promise<string[]> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const sessionIds: string[] = []
      for (const key in items) {
        if (key.startsWith("session_files_")) {
          sessionIds.push(key.replace("session_files_", ""))
        }
      }
      resolve(sessionIds)
    })
  })
}

export const runSessionFilesMigration = async (): Promise<void> => {
  const migration = new DatabaseMigration()
  const sessionIds = await getAllSessionIds()

  if (sessionIds.length > 0) {
    console.log(`Found ${sessionIds.length} session files to migrate`)
    const result = await migration.migrateSessionFiles(sessionIds)

    if (result.success) {
      console.log(`Successfully migrated ${result.migratedCount} session files`)
    } else {
      console.error("Session files migration completed with errors:")
      console.error(result.errors)
    }
  } else {
    console.log("No session files found to migrate")
  }
}

export const runAllMigrations = async (): Promise<void> => {
  await runMigration()
  await runSessionFilesMigration()
}
