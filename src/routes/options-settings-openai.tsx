import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { SettingsOpenai } from "~/components/Option/Settings/openai"

const OptionOllamaSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <SettingsOpenai />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionOllamaSettings