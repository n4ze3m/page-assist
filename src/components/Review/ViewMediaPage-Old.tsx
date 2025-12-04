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

  // Keep media search UI visible even when offline (disabled state handled in ReviewPage)
  if (!isOnline && demoEnabled) {
    // Still render ReviewPage so search UI is visible; demo mode stays offline-disabled
    return <ReviewPage allowGeneration={false} forceOffline />
  }

  if (!isOnline) {
    return <ReviewPage allowGeneration={false} forceOffline />
  }

  const mediaUnsupported =
    !capsLoading && capabilities && !capabilities.hasMedia

  if (isOnline && mediaUnsupported) {
    return (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              {t("review:mediaEmpty.featureUnavailableBadge", {
                defaultValue: "Feature unavailable"
              })}
            </span>
            <span>
              {t("review:mediaEmpty.offlineTitle", {
                defaultValue: "Media API not available on this server"
              })}
            </span>
          </span>
        }
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
