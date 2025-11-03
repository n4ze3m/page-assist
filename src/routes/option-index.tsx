import React from "react"
import { notification } from "antd"
import { useTranslation } from "react-i18next"

import HealthSummary from "@/components/Option/Settings/health-summary"
import { OnboardingWizard } from "@/components/Option/Onboarding/OnboardingWizard"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { getTldwServerURL } from "@/services/tldw-server"
import OptionLayout from "~/components/Layouts/Layout"
import { Playground } from "~/components/Option/Playground/Playground"

const OptionIndex = () => {
  const [needsOnboarding, setNeedsOnboarding] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)
  const { t } = useTranslation(["settings"])
  const errorToastRef = React.useRef(false)

  const notifyConnectionIssue = React.useCallback(
    (reason?: string) => {
      if (errorToastRef.current) {
        return
      }
      notification.error({
        key: "tldw-init-error",
        message: t("settings:tldw.loadError", "We couldn’t reach your tldw server"),
        description:
          reason ||
          t(
            "settings:onboarding.connectionFailedHint",
            "Open Settings → tldw Server to update the URL or credentials, then try again."
          ),
        placement: "bottomRight",
        duration: 6
      })
      errorToastRef.current = true
    },
    [t]
  )

  const clearConnectionIssue = React.useCallback(() => {
    notification.destroy("tldw-init-error")
    errorToastRef.current = false
  }, [])

  React.useEffect(() => {
    (async () => {
      try {
        let cfg = await tldwClient.getConfig()
        let hasServer = !!cfg?.serverUrl

        // Auto-seed a default/fallback URL for first-run to reduce friction
        if (!hasServer) {
          try {
            const fallback = await getTldwServerURL()
            if (fallback) {
              await tldwClient.updateConfig({ serverUrl: fallback, authMode: 'single-user' as any })
              cfg = await tldwClient.getConfig()
              hasServer = !!cfg?.serverUrl
            }
          } catch {}
        }

        if (!hasServer) {
          setNeedsOnboarding(true)
        } else {
          try {
            await tldwClient.initialize()
            const ok = await tldwClient.healthCheck()
            if (!ok) {
              notifyConnectionIssue()
            } else {
              clearConnectionIssue()
            }
            setNeedsOnboarding(!ok)
          } catch (error) {
            notifyConnectionIssue((error as Error)?.message)
            setNeedsOnboarding(true)
          }
        }
      } catch (error) {
        notifyConnectionIssue((error as Error)?.message)
        setNeedsOnboarding(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [clearConnectionIssue, notifyConnectionIssue])

  const showOnboarding = !loading && needsOnboarding

  return (
    <OptionLayout hideHeader={showOnboarding}>
      {loading ? (
        <div className="flex h-full min-h-[50vh] items-center justify-center">
          <PageAssistLoader />
        </div>
      ) : showOnboarding ? (
        <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm dark:border-gray-700 dark:bg-[#1a1a1a]">
          <OnboardingWizard onFinish={() => setNeedsOnboarding(false)} />
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
            {t(
              "onboarding.footerHelp",
              "Once connected, you can revisit these settings anytime from the extension menu."
            )}
          </p>
        </div>
      ) : (
        <>
          <HealthSummary />
          <Playground />
        </>
      )}
    </OptionLayout>
  )
}

export default OptionIndex
