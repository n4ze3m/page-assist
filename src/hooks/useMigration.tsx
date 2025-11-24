import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { hasLegacyData, runAllMigrations } from "~/db/dexie/migration"
import { Storage } from "@plasmohq/storage"
import { message } from "antd"

const MIGRATION_MESSAGE_KEY = "migration-status"
const isHarnessEnvironment =
  typeof chrome !== "undefined" && chrome.runtime?.id === "mock-runtime-id"

const storage = new Storage()

export const getIsMigrated = async () => {
  const isMigrated = await storage.get("isMigrated")
  return isMigrated || false
}

export const setIsMigrated = async (isMigrated: boolean) => {
  await storage.set("isMigrated", isMigrated)
}

interface MigrationResult {
  success: boolean
  needsReload: boolean
  error?: string
}

export const useMigration = () => {
  const migrationMutation = useMutation<MigrationResult, Error>({
    mutationFn: async () => {
      try {
        const isMigrated = await getIsMigrated()
        if (isMigrated) {
          return { success: false, needsReload: false }
        }

        const legacyExists = await hasLegacyData()

        if (!legacyExists) {
          console.info(
            "[migration] No legacy data found; marking as migrated without reload"
          )
          return { success: true, needsReload: false }
        }

        message.open({
          key: MIGRATION_MESSAGE_KEY,
          type: "loading",
          duration: 0,
          content: "Preparing your chat history…"
        })
        console.info("[migration] Starting background migration…")
        await runAllMigrations()
        message.open({
          key: MIGRATION_MESSAGE_KEY,
          type: "success",
          duration: 2.5,
          content: "Chat history is up to date."
        })
        console.info("[migration] Background migration completed successfully")
        return { success: true, needsReload: true }
      } catch (error) {
        console.error("Background migration failed:", error)
        message.open({
          key: MIGRATION_MESSAGE_KEY,
          type: "error",
          duration: 4,
          content:
            "We couldn't refresh your chat history. You can retry from Settings.",
          className: "max-w-sm"
        })
        return {
          success: false,
          needsReload: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
    },
    onSuccess: async (result) => {
      if (result.success) {
        await setIsMigrated(true)
        if (result.needsReload && !isHarnessEnvironment) {
          console.info("[migration] Reloading extension to apply updates")
          window.setTimeout(() => window.location.reload(), 250)
        } else if (!result.needsReload) {
          console.info(
            "[migration] Migration not required; skipping reload for new install"
          )
        } else {
          console.info("[migration] Skipping reload in harness environment")
        }
      }
    }
  })

  useEffect(() => {
    migrationMutation.mutate()
  }, [])

  return {
    isLoading: migrationMutation.isPending,
    isSuccess: migrationMutation.isSuccess && migrationMutation.data?.success,
    isError:
      migrationMutation.isError ||
      (migrationMutation.data && !migrationMutation.data.success),
    error: migrationMutation.data?.error || migrationMutation.error?.message,
    retry: () => migrationMutation.mutate()
  }
}
