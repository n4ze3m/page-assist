import OptionLayout from "~/components/Layouts/Layout"
import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import { EvaluationsSettings } from "@/components/Option/Settings/evaluations"

const OptionSettingsEvaluations = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <EvaluationsSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionSettingsEvaluations
