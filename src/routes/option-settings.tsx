import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { SettingOther } from "~/components/Option/Settings/other"

export const OptionSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <SettingOther />
      </SettingsLayout>
    </OptionLayout>
  )
}
