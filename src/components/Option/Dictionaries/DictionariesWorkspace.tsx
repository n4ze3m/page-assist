import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { DictionariesManager } from "./Manager"

export const DictionariesWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={t("option:dictionariesEmpty.demoTitle", {
          defaultValue: "Explore Chat dictionaries in demo mode"
        })}
        description={t("option:dictionariesEmpty.demoDescription", {
          defaultValue:
            "This demo shows how Chat dictionaries can normalize names, acronyms, and terms before they reach the model."
        })}
        examples={[
          t("option:dictionariesEmpty.demoExample1", {
            defaultValue:
              "Create example dictionaries for product names, project codenames, or company jargon."
          }),
          t("option:dictionariesEmpty.demoExample2", {
            defaultValue:
              "When you connect, you’ll be able to activate dictionaries across all chats."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    ) : (
      <FeatureEmptyState
        title={t("option:dictionariesEmpty.connectTitle", {
          defaultValue: "Connect to use Chat dictionaries"
        })}
        description={t("option:dictionariesEmpty.connectDescription", {
          defaultValue:
            "To use Chat dictionaries, first connect to your tldw server so substitutions can be stored."
        })}
        examples={[
          t("option:dictionariesEmpty.connectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("option:dictionariesEmpty.connectExample2", {
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
          {t("option:header.modeDictionaries", "Chat dictionaries")}
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {t("option:dictionariesEmpty.headerDescription", {
            defaultValue:
              "Define reusable substitutions so tldw understands your organization’s names, acronyms, and terminology."
          })}
        </p>
      </div>
      <DictionariesManager />
    </div>
  )
}

