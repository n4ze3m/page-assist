import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { ModelsBody } from "~/components/Option/Models"

const OptionModal = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <ModelsBody />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionModal
