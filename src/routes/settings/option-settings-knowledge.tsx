import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { KnowledgeSettings } from "@/components/Option/Knowledge"

 const OptionKnowledgeBase = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <KnowledgeSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionKnowledgeBase