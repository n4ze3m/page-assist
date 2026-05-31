import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { SettingsOllama } from "@/components/Option/Settings/ollama"

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
