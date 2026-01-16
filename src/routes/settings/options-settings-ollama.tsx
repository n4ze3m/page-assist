import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { SettingsOllama } from "~/components/Option/Settings/ollama"

 const OptionOllamaSettings = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <SettingsOllama />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionOllamaSettings