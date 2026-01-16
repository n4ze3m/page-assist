import { Route, Routes } from "react-router-dom"
import OptionIndex from "./settings/option-index"
import OptionSettings from "./settings/option-settings"
import OptionModal from "./settings/option-settings-model"
import OptionPrompt from "./settings/option-settings-prompt"
import OptionOllamaSettings from "./settings/options-settings-ollama"
import OptionShare from "./settings/option-settings-share"
import OptionKnowledgeBase from "./settings/option-settings-knowledge"
import OptionAbout from "./settings/option-settings-about"
import SidepanelChat from "./sidepanel-chat"
import SidepanelSettings from "./sidepanel-settings"
import OptionRagSettings from "./settings/option-rag"
import OptionChrome from "./settings/option-settings-chrome"
import OptionOpenAI from "./settings/option-settings-openai"
import SidepanelSettingsOpenAI from "./sidepanel-settings-openai"
import SidepanelSettingsModel from "./sidepanel-settings-model"
import { SettingsLayout } from "./SettingsLayout"

export const OptionRoutingChrome = () => {
  return (
    <Routes>
      <Route path="/" element={<OptionIndex />} />
      <Route path="/settings/*" element={<SettingsLayout />}>
        <Route path="" element={<OptionSettings />} />
        <Route path="model" element={<OptionModal />} />
        <Route path="prompt" element={<OptionPrompt />} />
        <Route path="ollama" element={<OptionOllamaSettings />} />
        <Route path="chrome" element={<OptionChrome />} />
        <Route path="openai" element={<OptionOpenAI />} />
        <Route path="share" element={<OptionShare />} />
        <Route path="knowledge" element={<OptionKnowledgeBase />} />
        <Route path="rag" element={<OptionRagSettings />} />
        <Route path="about" element={<OptionAbout />} />
      </Route>
    </Routes>
  )
}

export const SidepanelRoutingChrome = () => {
  return (
    <Routes>
      <Route path="/" element={<SidepanelChat />} />
      <Route path="/settings" element={<SidepanelSettings />} />
      <Route path="/settings/openai" element={<SidepanelSettingsOpenAI />} />
      <Route path="/settings/model" element={<SidepanelSettingsModel />} />
    </Routes>
  )
}
