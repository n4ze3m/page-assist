import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

const OptionCharacters = () => {
  const { t } = useTranslation(["settings", "option"])
  const navigate = useNavigate()

  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <FeatureEmptyState
          title={t("settings:charactersSettingsTitle", {
            defaultValue: "Characters workspace"
          })}
          description={t("settings:charactersSettingsDescription", {
            defaultValue:
              "Characters are managed from the Characters workspace. Use the button below to open it."
          })}
          primaryActionLabel={t("settings:charactersOpenWorkspace", {
            defaultValue: "Open Characters workspace"
          })}
          onPrimaryAction={() => navigate("/characters")}
        />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionCharacters
