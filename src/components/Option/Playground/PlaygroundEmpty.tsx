import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useDemoMode } from "@/context/demo-mode"

export const PlaygroundEmpty = () => {
  const { t } = useTranslation(["playground", "common"])
  const navigate = useNavigate()
  const { demoEnabled } = useDemoMode()

  const handleStartChat = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
  }, [])

  return (
    <div className="mx-auto mt-10 max-w-xl px-4">
      <FeatureEmptyState
        title={t("playground:empty.title", {
          defaultValue: "Start a new chat"
        })}
        description={
          demoEnabled
            ? t("playground:empty.demoDescription", {
                defaultValue:
                  "You’re in demo mode — try asking a question to see how the assistant responds. You can connect your own tldw server later."
              })
            : t("playground:empty.description", {
                defaultValue:
                  "Experiment with different models, prompts, and knowledge sources here."
              })
        }
        examples={[
          t("playground:empty.example1", {
            defaultValue:
              "Ask a question, then drag in documents or web pages you want to discuss."
          }),
          t("playground:empty.example2", {
            defaultValue:
              "Use Quick ingest to add transcripts or notes, then reference them in chat."
          }),
          t("playground:empty.example3", {
            defaultValue:
              "Try different prompts or models from the header to compare answers."
          })
        ]}
        primaryActionLabel={t("playground:empty.primaryCta", {
          defaultValue: "Start chatting"
        })}
        onPrimaryAction={handleStartChat}
        secondaryActionLabel={t("playground:empty.secondaryCta", {
          defaultValue: "Open server settings"
        })}
        onSecondaryAction={() => navigate("/settings/tldw")}
      />
    </div>
  )
}
