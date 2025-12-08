import OptionLayout from "~/components/Layouts/Layout"
import MediaReviewPage from "@/components/Review/MediaReviewPage"
import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { useDemoMode } from "@/context/demo-mode"

const MediaMultiInner = () => {
  const { t } = useTranslation(["review", "common", "settings"])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const { capabilities, loading: capsLoading } = useServerCapabilities()

  const demoMediaItems = React.useMemo(
    () => [
      {
        id: "demo-media-1",
        title: t("review:mediaEmpty.demoSample1Title", {
          defaultValue: "Demo media: Team call recording"
        }),
        meta: t("review:mediaEmpty.demoSample1Meta", {
          defaultValue: "Video · 25 min · Keywords: standup, planning"
        })
      },
      {
        id: "demo-media-2",
        title: t("review:mediaEmpty.demoSample2Title", {
          defaultValue: "Demo media: Product walkthrough"
        }),
        meta: t("review:mediaEmpty.demoSample2Meta", {
          defaultValue: "Screen recording · 12 min · Keywords: onboarding"
        })
      },
      {
        id: "demo-media-3",
        title: t("review:mediaEmpty.demoSample3Title", {
          defaultValue: "Demo media: Research article PDF"
        }),
        meta: t("review:mediaEmpty.demoSample3Meta", {
          defaultValue: "PDF · 6 pages · Keywords: summarization"
        })
      }
    ],
    [t]
  )

  if (!isOnline) {
    return demoEnabled ? (
      <div className="space-y-4">
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
              defaultValue: "See how processed media items appear in the Media viewer."
            }),
            t("review:mediaEmpty.demoExample2", {
              defaultValue:
                "When you connect, you’ll be able to browse and inspect media ingested from your own recordings and files."
            }),
            t("review:mediaEmpty.demoExample3", {
              defaultValue:
                "Use Media together with Review to summarize or analyze recordings."
            })
          ]}
          primaryActionLabel={t("common:connectToServer", {
            defaultValue: "Connect to server"
          })}
          onPrimaryAction={() => navigate("/settings/tldw")}
          secondaryActionLabel={t("option:header.quickIngest", "Quick ingest")}
          onSecondaryAction={() =>
            window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest"))
          }
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-[#111] dark:text-gray-200">
          <div className="mb-2 font-semibold">
            {t("review:mediaEmpty.demoPreviewHeading", {
              defaultValue: "Example media items (preview only)"
            })}
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {demoMediaItems.map((item) => (
              <div key={item.id} className="py-2">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </div>
                <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                  {item.meta}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
            defaultValue: "Open Settings → tldw server to add your server URL."
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

  const mediaUnsupported = !capsLoading && capabilities && !capabilities.hasMedia

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

  return <MediaReviewPage />
}

const OptionMediaMulti = () => {
  return (
    <OptionLayout>
      <MediaMultiInner />
    </OptionLayout>
  )
}

export default OptionMediaMulti
