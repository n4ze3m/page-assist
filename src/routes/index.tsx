import { Route, Routes } from "react-router-dom"
import { SidepanelChat } from "./sidepanel-chat"
import { SidepanelSettingsHeader } from "~components/Sidepanel/Settings/header"

export const Routing = () => <Routes></Routes>

export const SidepanelRouting = () => (
  <div className="dark">
    <Routes>
      <Route path="/" element={<SidepanelChat />} />
      <Route path="/settings" element={<SidepanelSettingsHeader />} />  
    </Routes>
  </div>
)
