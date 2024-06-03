import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { GeneralSettings } from "~/components/Option/Settings/general-settings"

 const OptionSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <GeneralSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionSettings