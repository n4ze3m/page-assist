import { SettingsBody } from "~/components/Sidepanel/Settings/body"
import { SidepanelSettingsHeader } from "~/components/Sidepanel/Settings/header"

const SidepanelSettings = () => {
  return (
    <div className="flex bg-neutral-50 dark:bg-[#171717] flex-col min-h-screen mx-auto max-w-7xl">
      <div className="sticky bg-white dark:bg-[#171717] top-0 z-10">
        <SidepanelSettingsHeader />
      </div>
      <SettingsBody />
    </div>
  )
}

export default SidepanelSettings
