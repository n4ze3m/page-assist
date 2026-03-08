import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { MCPSettingsApp } from "@/components/Option/Settings/mcp"

const OptionMCP = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <MCPSettingsApp />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionMCP
