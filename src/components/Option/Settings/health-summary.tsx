import { useEffect, useState } from "react"
import { Drawer, Button, Tooltip } from "antd"

import {
  useConnectionActions,
  useConnectionState,
  useConnectionUxState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { useTranslation } from "react-i18next"

export default function HealthSummary() {
  const { t } = useTranslation(["settings"])
  const {
    phase,
    isConnected,
    lastCheckedAt,
    knowledgeStatus,
    knowledgeLastCheckedAt
  } = useConnectionState()
  const { uxState, errorKind } = useConnectionUxState()
  const { checkOnce } = useConnectionActions()

  const [core, setCore] = useState<"unknown" | "ok" | "fail">("unknown")
  const [rag, setRag] = useState<"unknown" | "ok" | "fail">("unknown")

  const [coreCheckedAt, setCoreCheckedAt] = useState<number | null>(null)
  const [ragCheckedAt, setRagCheckedAt] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const diagnosticsPanelId = "health-diagnostics-panel"

  // Keep core/server status in sync with the shared connection state.
  useEffect(() => {
    void checkOnce()
  }, [checkOnce])

  useEffect(() => {
    if (phase === ConnectionPhase.SEARCHING) {
      setCore("unknown")
    } else if (isConnected && phase === ConnectionPhase.CONNECTED) {
      setCore("ok")
    } else if (
      phase === ConnectionPhase.ERROR ||
      phase === ConnectionPhase.UNCONFIGURED
    ) {
      setCore("fail")
    }
  }, [phase, isConnected])

  useEffect(() => {
    if (lastCheckedAt != null) {
      setCoreCheckedAt(lastCheckedAt)
    }
  }, [lastCheckedAt])

  // Map shared knowledgeStatus into a simple dot state.
  useEffect(() => {
    if (
      knowledgeStatus === "ready" ||
      knowledgeStatus === "indexing" ||
      knowledgeStatus === "empty"
    ) {
      setRag("ok")
    } else if (knowledgeStatus === "offline") {
      setRag("fail")
    } else {
      setRag("unknown")
    }
  }, [knowledgeStatus])

  useEffect(() => {
    if (knowledgeLastCheckedAt != null) {
      setRagCheckedAt(knowledgeLastCheckedAt)
    }
  }, [knowledgeLastCheckedAt])

  const Dot = ({ status }: { status: "unknown" | "ok" | "fail" }) => (
    <span
      aria-hidden
      className={`inline-block w-2 h-2 rounded-full ${
        status === "ok"
          ? "bg-green-500"
          : status === "fail"
            ? "bg-red-500"
            : "bg-gray-400"
      }`}
    />
  )

  let issueLabel: string | null = null
  let issueBody: string | null = null

  if (uxState === "error_auth" || errorKind === "auth") {
    issueLabel = t("healthSummary.issueAuth", "Authentication")
    issueBody = t(
      "healthSummary.issueAuthHint",
      "Your server responded but the API key or login is invalid. Fix your credentials in Settings → tldw server, then retry."
    )
  } else if (uxState === "error_unreachable" || errorKind === "unreachable") {
    issueLabel = t("healthSummary.issueConnectivity", "Connectivity")
    issueBody = t(
      "healthSummary.issueConnectivityHint",
      "We couldn’t reach your tldw server. Check that it’s running, your browser has site access, and any proxies or firewalls allow the connection."
    )
  } else if (rag === "fail") {
    issueLabel = t("healthSummary.issueRag", "Knowledge index")
    issueBody = t(
      "healthSummary.issueRagHint",
      "Chat is available, but the knowledge index looks offline. Re-run indexing or inspect RAG components in the detailed diagnostics."
    )
  }

  return (
    <div className="mb-3 p-2 rounded border border-transparent bg-transparent flex items-center justify-between transition-colors duration-150 hover:border-gray-200 hover:bg-gray-50 dark:border-transparent dark:hover:border-gray-700 dark:hover:bg-[#1c1c1c]">
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <span
          className="flex items-center gap-2"
          title={t(
            "healthSummary.coreAria",
            "Server: server/API health"
          )}
          aria-label={t(
            "healthSummary.coreAria",
            "Server: server/API health"
          )}>
          <Dot status={core} />{" "}
          {t("healthSummary.core", "Server")}
        </span>
        <span
          className="flex items-center gap-2"
          title={t(
            "healthSummary.ragAria",
            "Knowledge: knowledge index health"
          )}
          aria-label={t(
            "healthSummary.ragAria",
            "Knowledge: knowledge index health"
          )}>
          <Dot status={rag} />{" "}
          {t("healthSummary.rag", "Knowledge")}
        </span>
      </div>
      <Tooltip
        title={
          t(
            "healthSummary.diagnosticsTooltip",
            "Open detailed diagnostics to troubleshoot or inspect health checks."
          ) as string
        }>
        <Button
          size="small"
          type="link"
          className="text-blue-600 dark:text-blue-400"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={diagnosticsPanelId}
        >
          {t('healthSummary.diagnostics', 'Health & diagnostics')}
        </Button>
      </Tooltip>
      <Drawer
        title={t("healthSummary.diagnostics", "Health & diagnostics")}
        placement="right"
        width={360}
        onClose={() => setOpen(false)}
        open={open}>
        <div id={diagnosticsPanelId} className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dot status={core} /> {t("healthSummary.core", "Server")}
            </span>
            <span className="text-gray-500">
              {coreCheckedAt ? new Date(coreCheckedAt).toLocaleString() : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dot status={rag} /> {t("healthSummary.rag", "Knowledge")}
            </span>
            <span className="text-gray-500">
              {ragCheckedAt ? new Date(ragCheckedAt).toLocaleString() : ""}
            </span>
          </div>
          {issueLabel && issueBody && (
            <div className="pt-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="font-medium">
                {t(
                  "healthSummary.currentIssueLabel",
                  "Current focus"
                )}
                {": "}
                {issueLabel}
              </div>
              <div className="mt-1">
                {issueBody}
              </div>
            </div>
          )}
          <div className="pt-3 text-xs text-gray-500">
            {t(
              "healthSummary.footerInfo",
              "These checks summarize the last successful ping to your tldw server and knowledge index."
            )}
          </div>
        </div>
      </Drawer>
    </div>
  )
}
