import { Route, Routes } from "react-router-dom"
import { SidepanelChat } from "./sidepanel-chat"
import { useDarkMode } from "~hooks/useDarkmode"
import { SidepanelSettings } from "./sidepanel-settings"
import { OptionIndex } from "./option-index"

export const OptionRouting = () => (
  <Routes>
    <Route path="/" element={<OptionIndex />} />
  </Routes>
)

export const SidepanelRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={mode === "dark" ? "dark" : "light"}>
      <Routes>
        <Route path="/" element={<SidepanelChat />} />
        <Route path="/settings" element={<SidepanelSettings />} />
      </Routes>
    </div>
  )
}
