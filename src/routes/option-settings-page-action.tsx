import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { PageActionSettings } from "@/components/Option/Settings/page-action"

const OptionPageAction = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <PageActionSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionPageAction
