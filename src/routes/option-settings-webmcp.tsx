import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { WebMcpSettings } from "@/components/Option/Settings/webmcp"

const OptionWebMcp = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <WebMcpSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionWebMcp
