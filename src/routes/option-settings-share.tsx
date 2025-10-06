import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { OptionShareBody } from "~/components/Option/Share"

 const OptionShare = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <OptionShareBody />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionShare
