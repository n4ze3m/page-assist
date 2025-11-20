import React from "react"
import { useQuery } from "@tanstack/react-query"
import { getNoOfRetrievedDocs } from "@/services/app"
import { useTranslation } from "react-i18next"

export const RagDocsPerReplyHint: React.FC = () => {
  const { t } = useTranslation("knowledge")
  const { data } = useQuery({
    queryKey: ["rag:noOfRetrievedDocs"],
    queryFn: async () => {
      return await getNoOfRetrievedDocs()
    }
  })

  const value = typeof data === "number" ? data : 4

  return (
    <span className="text-[11px] text-gray-700 dark:text-gray-200">
      {t("ragWorkspace.docsPerReply.current", {
        defaultValue: "{{count}} docs per answer",
        count: value
      })}
    </span>
  )
}

export default RagDocsPerReplyHint

