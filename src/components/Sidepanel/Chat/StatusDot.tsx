import { Tooltip } from "antd"
import { useTranslation } from "react-i18next"
import {
  useConnectionActions,
  useConnectionUxState
} from "@/hooks/useConnectionState"

/**
 * Compact connection status indicator - a colored dot with tooltip.
 *
 * Colors:
 * - Green: Connected
 * - Yellow: Checking/Connecting
 * - Red/Amber: Disconnected or error
 */
export const StatusDot = () => {
  const { t } = useTranslation(["sidepanel"])
  const { uxState, mode, isConnectedUx, isChecking, isConfigOrError } =
    useConnectionUxState()
  const { checkOnce } = useConnectionActions()

  const dotClassName = (() => {
    const base = "h-2.5 w-2.5 rounded-full transition-colors"
    if (isConnectedUx) return `${base} bg-emerald-500`
    if (isChecking) return `${base} bg-yellow-500 animate-pulse`
    return `${base} bg-amber-500`
  })()

  const tooltip = (() => {
    if (isChecking) {
      return t(
        "sidepanel:header.connection.checking",
        "Checking connection to your tldw server…"
      )
    }
    if (isConnectedUx && mode === "demo") {
      return t(
        "sidepanel:header.connection.demo",
        "Demo mode: explore with a sample workspace."
      )
    }
    if (isConnectedUx) {
      return t(
        "sidepanel:header.connection.ok",
        "Connected to your tldw server"
      )
    }
    if (isConfigOrError) {
      return t(
        "sidepanel:header.connection.unconfigured",
        "Not connected. Open Settings to configure."
      )
    }
    return t(
      "sidepanel:header.connection.failed",
      "Connection failed. Click to retry."
    )
  })()

  const handleClick = () => {
    if (isChecking) return
    if (!isConnectedUx && !isConfigOrError) {
      // Retry connection
      void checkOnce()
    }
  }

  return (
    <Tooltip title={tooltip}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isChecking}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 disabled:cursor-default"
        aria-label={tooltip}
      >
        <span className={dotClassName} />
      </button>
    </Tooltip>
  )
}
