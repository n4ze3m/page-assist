import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { SettingOther } from "~/components/Option/Settings/other"

 const OptionSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <SettingOther />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionSettings