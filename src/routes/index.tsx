import { Route, Routes } from "react-router-dom"
import { SidepanelChat } from "./sidepanel-chat"
import { useDarkMode } from "~hooks/useDarkmode"
import { SidepanelSettings } from "./sidepanel-settings"
import { OptionIndex } from "./option-index"
import { OptionModal } from "./option-model"
import { OptionPrompt } from "./option-prompt"

export const OptionRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={mode === "dark" ? "dark" : "light"}>
      <Routes>
        <Route path="/" element={<OptionIndex />} />
        <Route path="/models" element={<OptionModal />} />
        <Route path="/prompts" element={<OptionPrompt />} />
      </Routes>
    </div>
  )
}

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
