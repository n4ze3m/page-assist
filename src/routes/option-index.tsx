import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import ServerConnectionCard from "@/components/Common/ServerConnectionCard"
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
  const navigate = useNavigate()

  const { phase } = useConnectionState()
  const { uxState, hasCompletedFirstRun } = useConnectionUxState()
  const { checkOnce, markFirstRunComplete } = useConnectionActions()

  React.useEffect(() => {
    void checkOnce()
  }, [checkOnce])

  useFocusComposerOnConnect(phase as ConnectionPhase | null)

  const isConnectedUx =
    uxState === "connected_ok" ||
    uxState === "connected_degraded" ||
    uxState === "demo_mode"

  // If the user connected via Settings/tldw without explicitly finishing
  // onboarding, mark first run complete on first successful connection so
  // the playground/chat composer becomes available.
  React.useEffect(() => {
    if (!hasCompletedFirstRun && isConnectedUx) {
      markFirstRunComplete()
    }
  }, [hasCompletedFirstRun, isConnectedUx, markFirstRunComplete])

  const isFirstRunShell = !hasCompletedFirstRun && !isConnectedUx
  const showConnectionShell = isFirstRunShell

  const showWizard =
    uxState === "unconfigured" ||
    uxState === "configuring_url" ||
    uxState === "configuring_auth" ||
    uxState === "testing" ||
    uxState === "error_auth" ||
    uxState === "error_unreachable"

  const hideHeader = showWizard

  return (
    <OptionLayout
      hideHeader={hideHeader}
      showHeaderSelectors={false}
    >
      {showConnectionShell ? (
        <div className="w-full">
          <ServerConnectionCard
            onOpenSettings={() => navigate("/settings/tldw")}
            onStartChat={() => {
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
              }, 0)
            }}
            enableDemo
          />
          {showWizard ? (
            <div className="mt-6">
              <OnboardingWizard
                onFinish={() => {
                  void checkOnce()
                }}
              />
              <div className="mx-auto mt-4 max-w-xl rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
                <div className="mb-1 font-semibold">
                  {t("playground:tips.title", "Tips")}
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    {t(
                      "playground:tips.quickIngest",
                      "Use Quick ingest to add documents and web pages."
                    )}
                  </li>
                  <li>
                    {t(
                      "playground:tips.focusComposer",
                      "Use the composer to start chatting once connected."
                    )}
                  </li>
                  <li>
                    {t(
                      "playground:tips.startChatFocus",
                      "When connected, “Start chatting” focuses the composer."
                    )}
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-4 text-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      "https://github.com/rmusser01/tldw_browser_assistant",
                      "_blank"
                    )
                  }>
                  {t(
                    "settings:onboarding.learnMoreTldw",
                    "Learn how tldw server works"
                  )}
                </button>
              </p>
              <div className="mx-auto mt-4 max-w-xl rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
                <div className="mb-1 font-semibold">
                  {t("playground:tips.title", "Tips")}
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    {t(
                      "playground:tips.quickIngest",
                      "Use Quick ingest to add documents and web pages."
                    )}
                  </li>
                  <li>
                    {t(
                      "playground:tips.pickModelPrompt",
                      "Pick a Model and a Prompt from the header."
                    )}
                  </li>
                  <li>
                    {t(
                      "playground:tips.startChatFocus",
                      "When connected, “Start chatting” focuses the composer."
                    )}
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      ) : (
        <Playground />
      )}
    </OptionLayout>
  )
}

export default OptionIndex
