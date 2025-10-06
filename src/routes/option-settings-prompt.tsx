import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { PromptBody } from "~/components/Option/Prompt"

 const OptionPrompt = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <PromptBody />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionPrompt
