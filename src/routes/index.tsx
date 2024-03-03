import { Route, Routes } from "react-router-dom"
import { SidepanelChat } from "./sidepanel-chat"
import { useDarkMode } from "~hooks/useDarkmode"
import { SidepanelSettings } from "./sidepanel-settings"
import { OptionIndex } from "./option-index"
import { OptionModal } from "./option-settings-model"
import { OptionPrompt } from "./option-settings-prompt"
import { OptionOllamaSettings } from "./options-settings-ollama"
import { OptionSettings } from "./option-settings"

export const OptionRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={mode === "dark" ? "dark" : "light"}>
      <Routes>
        <Route path="/" element={<OptionIndex />} />
        <Route path="/settings" element={<OptionSettings />} />
        <Route path="/settings/model" element={<OptionModal />} />
        <Route path="/settings/prompt" element={<OptionPrompt />} />
        <Route path="/settings/ollama" element={<OptionOllamaSettings />} />
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
