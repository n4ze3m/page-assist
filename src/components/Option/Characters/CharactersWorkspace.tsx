import React from "react"
import { Skeleton } from "antd"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import ConnectFeatureBanner from "@/components/Common/ConnectFeatureBanner"
import { PageShell } from "@/components/Common/PageShell"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { CharactersManager } from "./Manager"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"

export const CharactersWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common", "settings", "playground"])
  const navigate = useNavigate()
  const location = useLocation()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const hasCharacters = capabilities?.hasCharacters
  const fromPersistenceError = React.useMemo(
    () => location.search.includes("from=server-chat-persistence-error"),
    [location.search]
  )
  const fromHeaderSelect = React.useMemo(
    () => location.search.includes("from=header-select"),
    [location.search]
  )
  const newButtonRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (!fromHeaderSelect) return
    if (capsLoading || !hasCharacters) return

    const id = window.setTimeout(() => {
      newButtonRef.current?.focus()
    }, 300)

    return () => window.clearTimeout(id)
  }, [fromHeaderSelect, capsLoading, hasCharacters])

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              Demo
            </span>
            <span>
              {t("option:charactersEmpty.demoTitle", {
                defaultValue: "Explore Characters in demo mode"
              })}
            </span>
          </span>
        }
        description={t("option:charactersEmpty.demoDescription", {
          defaultValue:
            "This demo shows how Characters encapsulate a persona and system prompt that you can chat with."
        })}
        examples={[
          t("option:charactersEmpty.demoExample1", {
            defaultValue:
              "See example characters like a writing coach, lore expert, or coding assistant."
          }),
          t("option:charactersEmpty.demoExample2", {
            defaultValue:
              "When you connect, you’ll be able to create characters that appear in the chat header and selection."
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
              {t("option:charactersEmpty.connectTitle", {
                defaultValue: "Connect to use Characters"
              })}
            </span>
          </span>
        }
        description={t("option:charactersEmpty.connectDescription", {
          defaultValue:
            "To use Characters, first connect to your tldw server so character definitions can be stored."
        })}
        examples={[
          t("option:charactersEmpty.connectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("option:charactersEmpty.connectExample2", {
            defaultValue:
              "Use Diagnostics if your server is running but not reachable."
          })
        ]}
      />
    )
  }

  if (isOnline && !capsLoading && !hasCharacters) {
    return (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              Feature unavailable
            </span>
            <span>
              {t("option:charactersEmpty.offlineTitle", {
                defaultValue: "Characters API not available on this server"
              })}
            </span>
          </span>
        }
        description={t("option:charactersEmpty.offlineDescription", {
          defaultValue:
            "This server does not advertise /api/v1/characters."
        })}
        examples={[
          t("option:charactersEmpty.offlineExample1", {
            defaultValue:
              "Open Diagnostics to confirm your server version and available APIs for Characters."
          }),
          t("option:charactersEmpty.offlineExample2", {
            defaultValue:
              "If you upgrade your server, reload the extension and return to Characters."
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
          {t("option:header.modeCharacters", "Characters")}
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {t("option:charactersEmpty.headerDescription", {
            defaultValue:
              "Create reusable characters you can pick from the chat header and reuse across conversations."
          })}
        </p>
        {fromHeaderSelect && (
          <p className="mt-1 max-w-xl text-[11px] text-blue-700 dark:text-blue-300">
            {t("option:charactersEmpty.headerSelectHint", {
              defaultValue:
                "Create a character to reuse their persona across chats. Use “New character” to get started."
            })}
          </p>
        )}
        {fromPersistenceError && (
          <p className="mt-1 max-w-xl text-[11px] text-blue-700 dark:text-blue-300">
            <span className="font-semibold">
              {t(
                "playground:composer.persistence.serverCharacterHintTitle",
                "Create a default assistant character"
              )}
              {": "}
            </span>
            {t(
              "playground:composer.persistence.serverCharacterHintBody",
              "Create a simple assistant persona (name and a short description are enough). Once it exists, the extension can reuse it when saving chats to your server."
            )}
          </p>
        )}
      </div>
      {capsLoading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0f1115]">
          <Skeleton active title paragraph={{ rows: 5 }} />
        </div>
      )}
      {!capsLoading && hasCharacters && (
        <CharactersManager forwardedNewButtonRef={newButtonRef} />
      )}
    </PageShell>
  )
}
