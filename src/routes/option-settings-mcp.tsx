import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { McpSettings } from "@/components/Option/Settings/mcp-settings"

const OptionMcpSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <McpSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionMcpSettings