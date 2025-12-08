import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import ConnectFeatureBanner from "@/components/Common/ConnectFeatureBanner"
import { PageShell } from "@/components/Common/PageShell"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { WorldBooksManager } from "./Manager"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"

export const WorldBooksWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const { capabilities, loading: capsLoading } = useServerCapabilities()

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              Demo
            </span>
            <span>
              {t("option:worldBooksEmpty.demoTitle", {
                defaultValue: "Explore World Books in demo mode"
              })}
            </span>
          </span>
        }
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
      />
    ) : (
      <ConnectFeatureBanner
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
              Not connected
            </span>
            <span>
              {t("option:worldBooksEmpty.connectTitle", {
                defaultValue: "Connect to use World Books"
              })}
            </span>
          </span>
        }
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
      />
    )
  }

  const worldBooksUnsupported =
    !capsLoading && capabilities && !capabilities.hasWorldBooks

  if (isOnline && worldBooksUnsupported) {
    return (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              Feature unavailable
            </span>
            <span>
              {t("option:worldBooksEmpty.offlineTitle", {
                defaultValue: "World Books API not available on this server"
              })}
            </span>
          </span>
        }
        description={t("option:worldBooksEmpty.offlineDescription", {
          defaultValue:
            "This tldw server does not advertise the World Books endpoints (for example, /api/v1/characters/world-books). Upgrade your server to a version that includes World Books to use this workspace."
        })}
        examples={[
          t("option:worldBooksEmpty.offlineExample1", {
            defaultValue:
              "Open Health & diagnostics to confirm your server version and available APIs."
          }),
          t("option:worldBooksEmpty.offlineExample2", {
            defaultValue:
              "After upgrading, reload the extension and return to World Books."
          })
        ]}
        primaryActionLabel={t("settings:healthSummary.diagnostics", {
          defaultValue: "Health & diagnostics"
        })}
        onPrimaryAction={() => navigate("/settings/health")}
      />
    )
  }

  return (
    <PageShell className="space-y-4">
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
    </PageShell>
  )
}
