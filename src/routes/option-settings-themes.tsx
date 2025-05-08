import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { ThemesSettings } from "@/components/Option/Settings/themes"

const OptionThemes = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <ThemesSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionThemes