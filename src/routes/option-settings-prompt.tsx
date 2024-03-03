import { SettingsLayout } from "~components/Layouts/SettingsOptionLayout"
import OptionLayout from "~components/Option/Layout"
import { PromptBody } from "~components/Option/Prompt"

export const OptionPrompt = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <PromptBody />
      </SettingsLayout>
    </OptionLayout>
  )
}
