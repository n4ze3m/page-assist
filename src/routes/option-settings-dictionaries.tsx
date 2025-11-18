import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

const OptionDictionaries = () => {
  const { t } = useTranslation(["settings", "option"])
  const navigate = useNavigate()

  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <FeatureEmptyState
          title={t("settings:manageKnowledge.dictionariesSettingsTitle", {
            defaultValue: "Chat dictionaries workspace"
          })}
          description={t(
            "settings:manageKnowledge.dictionariesSettingsDescription",
            {
              defaultValue:
                "Chat dictionaries are managed from the Chat dictionaries workspace. Use the button below to open it."
            }
          )}
          primaryActionLabel={t(
            "settings:manageKnowledge.dictionariesOpenWorkspace",
            { defaultValue: "Open Chat dictionaries workspace" }
          )}
          onPrimaryAction={() => navigate("/dictionaries")}
        />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionDictionaries
