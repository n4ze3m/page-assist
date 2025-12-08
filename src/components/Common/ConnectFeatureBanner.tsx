import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import FeatureEmptyState from "@/components/Common/FeatureEmptyState"

type ConnectFeatureBannerProps = {
  title: React.ReactNode
  description?: React.ReactNode
  examples?: React.ReactNode[]
  showDiagnostics?: boolean
  className?: string
}

const ConnectFeatureBanner: React.FC<ConnectFeatureBannerProps> = ({
  title,
  description,
  examples,
  showDiagnostics = true,
  className
}) => {
  const { t } = useTranslation("settings")
  const navigate = useNavigate()

  const primaryLabel = t("tldw.setupLink", "Set up server")
  const diagnosticsLabel = t(
    "healthSummary.diagnostics",
    "Health & diagnostics"
  )

  return (
    <FeatureEmptyState
      title={title}
      description={description}
      examples={examples}
      primaryActionLabel={primaryLabel}
      onPrimaryAction={() => navigate("/settings/tldw")}
      secondaryActionLabel={showDiagnostics ? diagnosticsLabel : undefined}
      onSecondaryAction={
        showDiagnostics ? () => navigate("/settings/health") : undefined
      }
      className={className}
    />
  )
}

export default ConnectFeatureBanner

