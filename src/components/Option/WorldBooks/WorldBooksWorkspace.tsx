import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { WorldBooksManager } from "./Manager"

export const WorldBooksWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={t("option:worldBooksEmpty.demoTitle", {
          defaultValue: "Explore World Books in demo mode"
        })}
        description={t("option:worldBooksEmpty.demoDescription", {
          defaultValue:
            "This demo shows how World Books can organize structured knowledge about your worlds, settings, or products."
        })}
        examples={[
          t("option:worldBooksEmpty.demoExample1", {
            defaultValue:
              "See example entries like a fantasy setting, product glossary, or campaign notes."
          }),
          t("option:worldBooksEmpty.demoExample2", {
            defaultValue:
              "When you connect, you’ll be able to create world books that tldw can use while chatting."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    ) : (
      <FeatureEmptyState
        title={t("option:worldBooksEmpty.connectTitle", {
          defaultValue: "Connect to use World Books"
        })}
        description={t("option:worldBooksEmpty.connectDescription", {
          defaultValue:
            "To use World Books, first connect to your tldw server so world knowledge can be saved and retrieved."
        })}
        examples={[
          t("option:worldBooksEmpty.connectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("option:worldBooksEmpty.connectExample2", {
            defaultValue:
              "Use Diagnostics if your server is running but not reachable."
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
          {t("option:header.modeWorldBooks", "World Books")}
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {t("option:worldBooksEmpty.headerDescription", {
            defaultValue:
              "Create and manage structured knowledge bases that characters and chats can reference."
          })}
        </p>
      </div>
      <WorldBooksManager />
    </div>
  )
}

