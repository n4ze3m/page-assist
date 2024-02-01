import { Route, Routes } from "react-router-dom"
import { SidepanelChat } from "./sidepanel-chat"

export const Routing = () => <Routes></Routes>

export const SidepanelRouting = () => (
  <div className="dark">
    <Routes>
      <Route path="/" element={<SidepanelChat />} />
    </Routes>
  </div>
)
