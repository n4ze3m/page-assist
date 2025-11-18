import React from "react"
import { notification } from "antd"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import ServerConnectionCard from "@/components/Common/ServerConnectionCard"
import {
  useConnectionActions,
  useConnectionState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import OptionLayout from "~/components/Layouts/Layout"
import { Playground } from "~/components/Option/Playground/Playground"

const OptionIndex = () => {
  const { t } = useTranslation(["settings", "playground"])
  const navigate = useNavigate()
  const errorToastRef = React.useRef(false)

  const { phase, lastError } = useConnectionState()
  const { checkOnce } = useConnectionActions()

  const notifyConnectionIssue = React.useCallback(
    (reason?: string) => {
      if (errorToastRef.current) {
        return
      }
      notification.error({
        key: "tldw-init-error",
        message: t(
          "settings:tldw.loadError",
          "We couldn’t reach your tldw server"
        ),
        description:
          reason ??
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
    void checkOnce()
  }, [checkOnce])

  React.useEffect(() => {
    if (phase === ConnectionPhase.ERROR) {
      notifyConnectionIssue(lastError || undefined)
    } else if (phase === ConnectionPhase.CONNECTED) {
      clearConnectionIssue()
    }
  }, [phase, lastError, notifyConnectionIssue, clearConnectionIssue])

  const showOnboarding = phase !== ConnectionPhase.CONNECTED

  return (
    <OptionLayout hideHeader={showOnboarding}>
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
            <button onClick={() => navigate("/settings/tldw")}>
              {t("tldw.setupLink", "Set up server")}
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
