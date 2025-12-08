import React from "react"
import type { TFunction } from "i18next"
import type { ConnectionState, ConnectionUxState } from "@/types/connection"

export type UrlState =
  | { valid: false; reason: "empty" | "protocol" | "invalid" }
  | { valid: true; reason: "ok" }

export type ServerUrlHintTone = "neutral" | "error" | "success"

export interface ServerUrlHint {
  valid: boolean
  tone: ServerUrlHintTone
  message: string
}

export const useServerUrlHint = (
  serverUrl: string,
  urlState: UrlState,
  connectionState: ConnectionState,
  uxState: ConnectionUxState,
  t: TFunction
): ServerUrlHint =>
  React.useMemo(() => {
    if (!urlState.valid) {
      const tone: ServerUrlHintTone =
        urlState.reason === "empty" ? "neutral" : "error"
      let message: string
      if (urlState.reason === "empty") {
        message = t(
          "settings:onboarding.serverUrl.emptyHint",
          "Enter your tldw server URL to enable Next."
        )
      } else if (urlState.reason === "protocol") {
        message = t(
          "settings:onboarding.serverUrl.invalidProtocol",
          "Use http or https URLs, for example http://127.0.0.1:8000."
        )
      } else {
        message = t(
          "settings:onboarding.serverUrl.invalid",
          "Enter a full URL such as http://127.0.0.1:8000."
        )
      }

      return { valid: false, tone, message }
    }

    const trimmed = serverUrl.trim()
    const matchesCurrentServer =
      trimmed &&
      connectionState.serverUrl &&
      trimmed === connectionState.serverUrl

    if (matchesCurrentServer && connectionState.isChecking) {
      return {
        valid: true,
        tone: "neutral",
        message: t(
          "settings:onboarding.serverUrl.checking",
          "Checking reachability…"
        )
      }
    }

    if (
      matchesCurrentServer &&
      (uxState === "connected_ok" || uxState === "connected_degraded")
    ) {
      return {
        valid: true,
        tone: "success",
        message: t(
          "settings:onboarding.serverUrl.reachable",
          "Server responded successfully. You can continue."
        )
      }
    }

    if (matchesCurrentServer && uxState === "error_unreachable") {
      return {
        valid: true,
        tone: "error",
        message: t(
          "settings:onboarding.serverUrl.unreachable",
          "We couldn’t reach this address yet. Double-check the URL or try again."
        )
      }
    }

    return {
      valid: true,
      tone: "neutral",
      message: t(
        "settings:onboarding.serverUrl.ready",
        "Enter your tldw server URL, then click Next to test your connection."
      )
    }
  }, [serverUrl, urlState, connectionState.serverUrl, connectionState.isChecking, uxState, t])
