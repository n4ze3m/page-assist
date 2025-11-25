import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import ServerConnectionCard from "@/components/Common/ServerConnectionCard"
import {
  useConnectionActions,
  useConnectionState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { useFocusComposerOnConnect } from "@/hooks/useComposerFocus"
import OptionLayout from "~/components/Layouts/Layout"
import { Playground } from "~/components/Option/Playground/Playground"

const OptionIndex = () => {
  const { t } = useTranslation(["settings", "playground"])
  const navigate = useNavigate()

  const { phase } = useConnectionState()
  const { checkOnce } = useConnectionActions()

  React.useEffect(() => {
    void checkOnce()
  }, [checkOnce])

  useFocusComposerOnConnect(phase as ConnectionPhase | null)

  const showOnboarding = phase !== ConnectionPhase.CONNECTED

  return (
    <OptionLayout
      hideHeader={showOnboarding}
      showHeaderSelectors={!showOnboarding}
    >
      {showOnboarding ? (
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
        </div>
      ) : (
        <Playground />
      )}
    </OptionLayout>
  )
}

export default OptionIndex
