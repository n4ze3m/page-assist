import { SettingsBody } from "~components/Sidepanel/Settings/body"
import { SidepanelSettingsHeader } from "~components/Sidepanel/Settings/header"

export const SidepanelSettings = () => {
  return (
    <div className="flex bg-white dark:bg-black flex-col min-h-screen mx-auto max-w-7xl">
      <div className="sticky top-0 z-10">
        <SidepanelSettingsHeader />
      </div>
      <SettingsBody />
    </div>
  )
}
