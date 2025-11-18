import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

const OptionWorldBooks = () => {
  const { t } = useTranslation(["settings", "option"])
  const navigate = useNavigate()

  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <FeatureEmptyState
          title={t("settings:manageKnowledge.worldBooksSettingsTitle", {
            defaultValue: "World Books workspace"
          })}
          description={t(
            "settings:manageKnowledge.worldBooksSettingsDescription",
            {
              defaultValue:
                "World Books are managed from the World Books workspace. Use the button below to open it."
            }
          )}
          primaryActionLabel={t(
            "settings:manageKnowledge.worldBooksOpenWorkspace",
            { defaultValue: "Open World Books workspace" }
          )}
          onPrimaryAction={() => navigate("/world-books")}
        />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionWorldBooks
