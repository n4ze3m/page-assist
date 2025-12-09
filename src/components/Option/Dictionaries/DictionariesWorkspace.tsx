import React from "react"
import { useTranslation } from "react-i18next"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import ConnectFeatureBanner from "@/components/Common/ConnectFeatureBanner"
import { PageShell } from "@/components/Common/PageShell"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { DictionariesManager } from "./Manager"

export const DictionariesWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common", "settings"])
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              Demo
            </span>
            <span>
              {t("option:dictionariesEmpty.demoTitle", {
                defaultValue: "Explore Chat dictionaries in demo mode"
              })}
            </span>
          </span>
        }
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
      />
    ) : (
      <ConnectFeatureBanner
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
              Not connected
            </span>
            <span>
              {t("option:dictionariesEmpty.connectTitle", {
                defaultValue: "Connect to use Chat dictionaries"
              })}
            </span>
          </span>
        }
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
      />
    )
  }

  return (
    <PageShell className="space-y-4">
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
    </PageShell>
  )
}
