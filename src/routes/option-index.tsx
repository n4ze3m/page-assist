import OptionLayout from "~/components/Layouts/Layout"
import { Playground } from "~/components/Option/Playground/Playground"
import HealthSummary from "@/components/Option/Settings/health-summary"

const OptionIndex = () => {
  return (
    <OptionLayout>
      <HealthSummary />
      <Playground />
    </OptionLayout>
  )
}

export default OptionIndex
