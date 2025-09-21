import OptionLayout from "~/components/Layouts/Layout"
import { Playground } from "~/components/Option/Playground/Playground"
import HealthSummary from "@/components/Option/Settings/health-summary"
import { OnboardingWizard } from "@/components/Option/Onboarding/OnboardingWizard"
import React from "react"
import { tldwClient } from "@/services/tldw/TldwApiClient"

const OptionIndex = () => {
  const [needsOnboarding, setNeedsOnboarding] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    (async () => {
      try {
        const cfg = await tldwClient.getConfig()
        const hasServer = !!cfg?.serverUrl
        if (!hasServer) {
          setNeedsOnboarding(true)
        } else {
          try {
            await tldwClient.initialize()
            const ok = await tldwClient.healthCheck()
            setNeedsOnboarding(!ok)
          } catch {
            setNeedsOnboarding(true)
          }
        }
      } catch {
        setNeedsOnboarding(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <OptionLayout>
      {loading ? null : needsOnboarding ? (
        <OnboardingWizard onFinish={() => setNeedsOnboarding(false)} />
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
