import { SettingsLayout } from "~components/Layouts/SettingsOptionLayout"
import OptionLayout from "~components/Option/Layout"
import { ModelsBody } from "~components/Option/Models"

export const OptionModal = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <ModelsBody />
      </SettingsLayout>
    </OptionLayout>
  )
}