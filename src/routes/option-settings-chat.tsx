import { SettingsLayout } from "~/components/Layouts/SettingsOptionLayout"
import OptionLayout from "~/components/Layouts/Layout"
import { ChatSettings } from "~/components/Option/Settings/chat-settings"

const OptionChatSettings = () => {
  return (
    <OptionLayout hideHeader>
      <SettingsLayout>
        <ChatSettings />
      </SettingsLayout>
    </OptionLayout>
  )
}

export default OptionChatSettings

