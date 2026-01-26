import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { ModelsBody } from "@/components/Option/Models"

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
