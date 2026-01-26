import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { OptionShareBody } from "@/components/Option/Share"

const OptionShare = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <OptionShareBody />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionShare
