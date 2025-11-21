import OptionLayout from "~/components/Layouts/Layout"
import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import { PromptStudioSettings } from "@/components/Option/Settings/prompt-studio"

const OptionSettingsPromptStudio = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <PromptStudioSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionSettingsPromptStudio
