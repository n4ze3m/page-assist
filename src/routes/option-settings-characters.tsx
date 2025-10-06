import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { CharactersManager } from "~/components/Option/Characters/Manager"

const OptionCharacters = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <CharactersManager />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionCharacters
