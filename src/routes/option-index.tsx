import React from "react"
import { App } from "antd"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import ServerConnectionCard from "@/components/Common/ServerConnectionCard"
import { cleanUrl } from "@/libs/clean-url"
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
  const { notification } = App.useApp()
  const errorToastRef = React.useRef(false)
  const successToastRef = React.useRef(false)

  const { phase, lastError, serverUrl } = useConnectionState()
  const { checkOnce } = useConnectionActions()

  const notifyConnectionIssue = React.useCallback(
    (reason?: string) => {
      if (errorToastRef.current) {
        return
      }
      const host = serverUrl ? cleanUrl(serverUrl) : "tldw_server"
      const baseHint = t(
        "settings:onboarding.connectionFailedTip",
        "Check that the server is running at {{host}}, then use “Retry connection” on this page or open Settings → tldw Server to update the URL or credentials.",
        { host }
      )
      const description = reason
        ? `${baseHint}\n\n${t(
            "settings:onboarding.errorDetailsLabel",
            "Details:"
          )} ${reason}`
        : baseHint

      notification.error({
        key: "tldw-init-error",
        message: t(
          "settings:tldw.loadError",
          "We couldn’t reach your tldw server"
        ),
        description,
        placement: "bottomRight",
        duration: 6
      })
      errorToastRef.current = true
    },
    [t, serverUrl]
  )

  const clearConnectionIssue = React.useCallback(() => {
    notification.destroy("tldw-init-error")
    errorToastRef.current = false
  }, [])

  const notifyConnectionSuccess = React.useCallback(() => {
    if (successToastRef.current) {
      return
    }
    const host = serverUrl ? cleanUrl(serverUrl) : "tldw_server"
    notification.success({
      key: "tldw-init-success",
      message: t(
        "settings:onboarding.connectedTitle",
        "Connected to tldw_server"
      ),
      description: t(
        "settings:onboarding.connectedDescription",
        "Connected to {{host}}. You can now chat here or in the sidepanel.",
        { host }
      ),
      placement: "bottomRight",
      duration: 5
    })
    successToastRef.current = true
  }, [t, serverUrl])

  React.useEffect(() => {
    void checkOnce()
  }, [checkOnce])

  React.useEffect(() => {
    if (phase === ConnectionPhase.ERROR) {
      notifyConnectionIssue(lastError || undefined)
    } else if (phase === ConnectionPhase.CONNECTED) {
      clearConnectionIssue()
      notifyConnectionSuccess()
    }
  }, [phase, lastError, notifyConnectionIssue, clearConnectionIssue, notifyConnectionSuccess])

  const previousPhaseRef = React.useRef<ConnectionPhase | null>(null)

  React.useEffect(() => {
    if (
      previousPhaseRef.current !== ConnectionPhase.CONNECTED &&
      phase === ConnectionPhase.CONNECTED
    ) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
      }, 0)
    }
    previousPhaseRef.current = phase
  }, [phase])

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
            showToastOnError
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
