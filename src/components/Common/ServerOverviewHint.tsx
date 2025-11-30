import React from "react"
import { useTranslation } from "react-i18next"

export const ServerOverviewHint: React.FC = () => {
  const { t } = useTranslation("settings")

  const openDocs = () => {
    try {
      const docsUrl =
        t(
          "onboarding.serverDocsUrl",
          "https://docs.tldw.app/extension/server-setup"
        ) || "https://docs.tldw.app/extension/server-setup"
      window.open(docsUrl, "_blank", "noopener,noreferrer")
    } catch {
      // ignore navigation errors
    }
  }

  return (
    <div className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 p-3 text-left text-xs text-gray-700 dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-200">
      <p className="mb-1 text-sm font-medium">
        {t(
          "serverOverview.title",
          "How tldw server fits into this extension"
        )}
      </p>
      <ul className="mb-2 list-disc space-y-1 pl-4">
        <li>
          {t(
            "serverOverview.pointChat",
            "Powers chat, multi-turn memory, and server-backed history."
          )}
        </li>
        <li>
          {t(
            "serverOverview.pointKnowledge",
            "Enables Knowledge search & RAG so chats can reference your own documents."
          )}
        </li>
        <li>
          {t(
            "serverOverview.pointMedia",
            "Handles media ingest, transcription, and metrics so you can review calls and videos."
          )}
        </li>
      </ul>
      <button
        type="button"
        onClick={openDocs}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {t(
          "serverOverview.docsCta",
          "View server setup guide"
        )}
      </button>
    </div>
  )
}

export default ServerOverviewHint

