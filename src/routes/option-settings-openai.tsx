import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { OpenAIApp } from "@/components/Option/Settings/openai"

const OptionOpenAI = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <OpenAIApp />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionOpenAI
