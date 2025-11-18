import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

const OptionPrompt = () => {
  const { t } = useTranslation(["settings", "option"])
  const navigate = useNavigate()

  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <FeatureEmptyState
          title={t("settings:managePrompts.workspaceTitle", {
            defaultValue: "Prompts workspace"
          })}
          description={t("settings:managePrompts.workspaceDescription", {
            defaultValue:
              "Reusable prompts are managed from the Prompts workspace. Use the button below to open it."
          })}
          primaryActionLabel={t("settings:managePrompts.openWorkspace", {
            defaultValue: "Open Prompts workspace"
          })}
          onPrimaryAction={() => navigate("/prompts")}
        />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionPrompt
