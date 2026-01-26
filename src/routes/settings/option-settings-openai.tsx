import OptionLayout from "@/components/Layouts/Layout"
import { SettingsLayout } from "@/components/Layouts/SettingsOptionLayout"
import { OpenAIApp } from "@/components/Option/Settings/openai"

const OptionOpenAI = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <OpenAIApp />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionOpenAI
