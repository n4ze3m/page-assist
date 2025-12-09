import React from "react"
import { useTranslation } from "react-i18next"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import ConnectFeatureBanner from "@/components/Common/ConnectFeatureBanner"
import { PageShell } from "@/components/Common/PageShell"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { translateMessage } from "@/i18n/translateMessage"
import { DictionariesManager } from "./Manager"

export const DictionariesWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common"])
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
        description={translateMessage(
          t,
          "option:dictionariesEmpty.demoDescription",
          "This demo shows how Chat dictionaries can normalize names, acronyms, and terms before they reach the model."
        )}
        examples={[
          translateMessage(
            t,
            "option:dictionariesEmpty.demoExample1",
            "Create example dictionaries for product names, project codenames, or company jargon."
          ),
          translateMessage(
            t,
            "option:dictionariesEmpty.demoExample2",
            "When you connect, you’ll be able to activate dictionaries across all chats."
          )
        ]}
      />
    ) : (
      <ConnectFeatureBanner
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
              {translateMessage(
                t,
                "option:dictionariesEmpty.notConnected",
                "Not connected"
              )}
            </span>
            <span>
              {translateMessage(
                t,
                "option:dictionariesEmpty.connectTitle",
                "Connect to use Chat dictionaries"
              )}
            </span>
          </span>
        }
        description={translateMessage(
          t,
          "option:dictionariesEmpty.connectDescription",
          "To use Chat dictionaries, first connect to your tldw server so substitutions can be stored."
        )}
        examples={[
          translateMessage(
            t,
            "option:dictionariesEmpty.connectExample1",
            "Open Settings → tldw server to add your server URL."
          ),
          translateMessage(
            t,
            "option:dictionariesEmpty.connectExample2",
            "Use Diagnostics if your server is running but not reachable."
          )
        ]}
      />
    )
  }

  return (
    <PageShell className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {translateMessage(
            t,
            "option:header.modeDictionaries",
            "Chat dictionaries"
          )}
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {translateMessage(
            t,
            "option:dictionariesEmpty.headerDescription",
            "Define reusable substitutions so tldw understands your organization’s names, acronyms, and terminology."
          )}
        </p>
      </div>
      <DictionariesManager />
    </PageShell>
  )
}
