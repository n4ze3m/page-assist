import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { PromptBody } from "@/components/Option/Prompt"

const OptionPrompt = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <PromptBody />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionPrompt
