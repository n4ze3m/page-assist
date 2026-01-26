import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { RagSettings } from "@/components/Option/Settings/rag"

const OptionRagSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <RagSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionRagSettings
