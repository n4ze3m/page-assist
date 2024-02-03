import { Route, Routes } from "react-router-dom"
import { SidepanelChat } from "./sidepanel-chat"
import { SidepanelSettingsHeader } from "~components/Sidepanel/Settings/header"
import { useDarkMode } from "~hooks/useDarkmode"

export const Routing = () => <Routes></Routes>

export const SidepanelRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={mode === "dark" ? "dark" : "light"}>
      <Routes>
        <Route path="/" element={<SidepanelChat />} />
        <Route path="/settings" element={<SidepanelSettingsHeader />} />
      </Routes>
    </div>
  )
}
