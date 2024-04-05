import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { KnowledgeSettings } from "@/components/Option/Knowledge"

export const OptionKnowledgeBase = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <KnowledgeSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}
