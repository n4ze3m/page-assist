import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { ChromeApp } from "@/components/Option/Settings/chrome"

const OptionChrome = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <ChromeApp />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionChrome
