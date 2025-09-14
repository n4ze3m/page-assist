import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import OptionLayout from "@/components/Layouts/Layout"
import { TldwSettings } from "@/components/Option/Settings/tldw"

export const OptionTldwSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <TldwSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}
