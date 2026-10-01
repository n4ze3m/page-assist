import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { AboutApp } from "@/components/Option/Settings/about"

const OptionAbout = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <AboutApp />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionAbout
