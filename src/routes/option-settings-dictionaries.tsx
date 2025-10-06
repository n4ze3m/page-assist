import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { DictionariesManager } from "~/components/Option/Dictionaries/Manager"

const OptionDictionaries = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <DictionariesManager />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionDictionaries
