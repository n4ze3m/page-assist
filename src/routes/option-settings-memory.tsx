import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { MemorySettings } from "@/components/Option/Settings/memory"

const OptionMemory = () => {
  return (
    <OptionLayout>
      <SettingsLayout>
        <MemorySettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionMemory
