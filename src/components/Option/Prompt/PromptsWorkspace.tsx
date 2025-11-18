import React from "react"
import { useTranslation } from "react-i18next"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useNavigate } from "react-router-dom"
import { PromptBody } from "."

export const PromptsWorkspace: React.FC = () => {
  const { t } = useTranslation(["settings", "common"])
  const isOnline = useServerOnline()
  const navigate = useNavigate()

  if (!isOnline) {
    return (
      <FeatureEmptyState
        title={t("settings:managePrompts.emptyConnectTitle", {
          defaultValue: "Connect to use Prompts"
        })}
        description={t("settings:managePrompts.emptyConnectDescription", {
          defaultValue:
            "To manage reusable prompts, first connect to your tldw server."
        })}
        examples={[
          t("settings:managePrompts.emptyConnectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("settings:managePrompts.emptyConnectExample2", {
            defaultValue:
              "Once connected, create custom prompts you can reuse across chats."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t("option:header.modePrompts", "Prompts")}
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {t("settings:managePrompts.emptyDescription", {
            defaultValue:
              "Create reusable prompts for recurring tasks, workflows, and team conventions."
          })}
        </p>
      </div>
      <PromptBody />
    </div>
  )
}

