import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { WorldBooksManager } from "~/components/Option/WorldBooks/Manager"

const OptionWorldBooks = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <WorldBooksManager />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionWorldBooks
