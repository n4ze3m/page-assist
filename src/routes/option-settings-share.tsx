import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { OptionShareBody } from "~/components/Option/Share"

export const OptionShare = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <OptionShareBody />
      </SettingsLayout>
    </OptionLayout>
  )
}
