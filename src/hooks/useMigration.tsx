import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { runAllMigrations } from "~/db/dexie/migration"
import { Storage } from "@plasmohq/storage"
import { message, notification } from "antd"

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
  error?: string
}

export const useMigration = () => {
  const migrationMutation = useMutation<MigrationResult, Error>({
    mutationFn: async () => {
      try {
        const isMigrated = await getIsMigrated()
        if (isMigrated) {
          return { success: false }
        }
        message.loading(
          "Sorry for the interruption. This is a one-time update that won't occur again. This is for a better optimized chat. The page will refresh after the update.",
          30_000
        )
        console.log("Starting background migration...")
        await runAllMigrations()
        console.log("Background migration completed successfully")
        return { success: true }
      } catch (error) {
        console.error("Background migration failed:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
  },
    onSuccess: async (result) => {
      if (result.success) {
        await setIsMigrated(true)
        notification.success({
          message: "Migration completed successfully"
        })
        window.location.reload()
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
