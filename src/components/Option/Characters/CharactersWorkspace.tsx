import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useDemoMode } from "@/context/demo-mode"
import { CharactersManager } from "./Manager"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"

export const CharactersWorkspace: React.FC = () => {
  const { t } = useTranslation(["option", "common", "settings"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
   const { capabilities, loading: capsLoading } = useServerCapabilities()

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={t("option:charactersEmpty.demoTitle", {
          defaultValue: "Explore Characters in demo mode"
        })}
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
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    ) : (
      <FeatureEmptyState
        title={t("option:charactersEmpty.connectTitle", {
          defaultValue: "Connect to use Characters"
        })}
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
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
  }

  const charactersUnsupported =
    !capsLoading && capabilities && !capabilities.hasCharacters

  if (isOnline && charactersUnsupported) {
    return (
      <FeatureEmptyState
        title={t("option:charactersEmpty.offlineTitle", {
          defaultValue: "Characters API not available on this server"
        })}
        description={t("option:charactersEmpty.offlineDescription", {
          defaultValue:
            "This tldw server does not advertise the Characters endpoints (for example, /api/v1/characters). Upgrade your server to a version that includes Characters to use this workspace."
        })}
        examples={[
          t("option:charactersEmpty.offlineExample1", {
            defaultValue:
              "Open Diagnostics to confirm your server version and available APIs."
          }),
          t("option:charactersEmpty.offlineExample2", {
            defaultValue:
              "After upgrading, reload the extension and return to Characters."
          })
        ]}
        primaryActionLabel={t("settings:healthSummary.diagnostics", {
          defaultValue: "Open Diagnostics"
        })}
        onPrimaryAction={() => navigate("/settings/health")}
      />
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
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
      </div>
      <CharactersManager />
    </div>
  )
}
