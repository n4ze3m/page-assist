import React from "react"
import { useTranslation } from "react-i18next"

import {
  useConnectionActions,
  useConnectionState,
  useConnectionUxState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { useFocusComposerOnConnect } from "@/hooks/useComposerFocus"
import { OnboardingWizard } from "@/components/Option/Onboarding/OnboardingWizard"
import OptionLayout from "~/components/Layouts/Layout"
import { Playground } from "~/components/Option/Playground/Playground"

const OptionIndex = () => {
  const { t } = useTranslation(["settings", "playground"])

  const { phase } = useConnectionState()
  const { uxState, hasCompletedFirstRun } = useConnectionUxState()
  const { checkOnce, beginOnboarding } = useConnectionActions()
  const onboardingInitiated = React.useRef(false)

  React.useEffect(() => {
    if (hasCompletedFirstRun) {
      void checkOnce()
    }
  }, [checkOnce, hasCompletedFirstRun])

  React.useEffect(() => {
    if (!hasCompletedFirstRun && !onboardingInitiated.current) {
      onboardingInitiated.current = true
      beginOnboarding()
    }
  }, [hasCompletedFirstRun, beginOnboarding])

  useFocusComposerOnConnect(phase as ConnectionPhase | null)

  // During first-time setup, hide the connection shell entirely and show only
  // the onboarding wizard (“Welcome — Let’s get you connected”).
  if (!hasCompletedFirstRun) {
    const showWizard = true

    return (
      <OptionLayout hideHeader={showWizard} showHeaderSelectors={false}>
        {showWizard && (
          <OnboardingWizard
            onFinish={() => {
              void checkOnce()
            }}
          />
        )}
      </OptionLayout>
    )
  }

  return (
    <OptionLayout
      showHeaderSelectors={false}
    >
      <Playground />
    </OptionLayout>
  )
}

export default OptionIndex
