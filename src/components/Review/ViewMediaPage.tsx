import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import ReviewPage from "./ReviewPage"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { useDemoMode } from "@/context/demo-mode"

// View Media page (analysis-style). This clones the Review & Analyze UI
// for users who prefer that workflow under the "View Media" entry.
const ViewMediaPage: React.FC = () => {
  const { t } = useTranslation(["review", "common", "settings"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const { demoEnabled } = useDemoMode()

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={t("review:mediaEmpty.demoTitle", {
          defaultValue: "Explore Media in demo mode"
        })}
        description={t("review:mediaEmpty.demoDescription", {
          defaultValue:
            "This demo shows how tldw Assistant can display and inspect processed media. Connect your own server later to browse your own recordings and documents."
        })}
        examples={[
          t("review:mediaEmpty.demoExample1", {
            defaultValue:
              "See how processed media items appear in the Media viewer."
          }),
          t("review:mediaEmpty.demoExample2", {
            defaultValue:
              "When you connect, you’ll be able to browse and inspect media ingested from your own recordings and files."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    ) : (
      <FeatureEmptyState
        title={t("review:mediaEmpty.connectTitle", {
          defaultValue: "Connect to use Media"
        })}
        description={t("review:mediaEmpty.connectDescription", {
          defaultValue:
            "To view processed media, first connect to your tldw server so recordings and documents can be listed here."
        })}
        examples={[
          t("review:mediaEmpty.connectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("review:mediaEmpty.connectExample2", {
            defaultValue:
              "Once connected, use Quick ingest in the header to add media from your own recordings and files."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
  }

  const mediaUnsupported =
    !capsLoading && capabilities && !capabilities.hasMedia

  if (isOnline && mediaUnsupported) {
    return (
      <FeatureEmptyState
        title={t("review:mediaEmpty.offlineTitle", {
          defaultValue: "Media API not available on this server"
        })}
        description={t("review:mediaEmpty.offlineDescription", {
          defaultValue:
            "This tldw server does not advertise the Media endpoints (for example, /api/v1/media and /api/v1/media/search). Upgrade your server to a version that includes Media to use this workspace."
        })}
        examples={[
          t("review:mediaEmpty.offlineExample1", {
            defaultValue:
              "Open Diagnostics to confirm your server version and available APIs."
          }),
          t("review:mediaEmpty.offlineExample2", {
            defaultValue:
              "After upgrading, reload the extension and return to Media."
          })
        ]}
        primaryActionLabel={t("settings:healthSummary.diagnostics", {
          defaultValue: "Open Diagnostics"
        })}
        onPrimaryAction={() => navigate("/settings/health")}
      />
    )
  }

  return <ReviewPage allowGeneration={false} />
}

export default ViewMediaPage
