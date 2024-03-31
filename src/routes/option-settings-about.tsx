import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { AboutApp } from "@/components/Option/Settings/about"

export const OptionAbout = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <AboutApp />
      </SettingsLayout>
    </OptionLayout>
  )
}
