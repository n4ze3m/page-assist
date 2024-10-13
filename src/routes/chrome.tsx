import { Route, Routes } from "react-router-dom"
import OptionIndex from "./option-index"
import OptionSettings from "./option-settings"
import OptionModal from "./option-settings-model"
import OptionPrompt from "./option-settings-prompt"
import OptionOllamaSettings from "./options-settings-ollama"
import OptionShare from "./option-settings-share"
import OptionKnowledgeBase from "./option-settings-knowledge"
import OptionAbout from "./option-settings-about"
import SidepanelChat from "./sidepanel-chat"
import SidepanelSettings from "./sidepanel-settings"
import OptionRagSettings from "./option-rag"
import OptionChrome from "./option-settings-chrome"
import OptionOpenAI from "./option-settings-openai"

export const OptionRoutingChrome = () => {
  return (
    <Routes>
      <Route path="/" element={<OptionIndex />} />
      <Route path="/settings" element={<OptionSettings />} />
      <Route path="/settings/model" element={<OptionModal />} />
      <Route path="/settings/prompt" element={<OptionPrompt />} />
      <Route path="/settings/ollama" element={<OptionOllamaSettings />} />
      <Route path="/settings/chrome" element={<OptionChrome />} />
      <Route path="/settings/openai" element={<OptionOpenAI />} />
      <Route path="/settings/share" element={<OptionShare />} />
      <Route path="/settings/knowledge" element={<OptionKnowledgeBase />} />
      <Route path="/settings/rag" element={<OptionRagSettings />} />
      <Route path="/settings/about" element={<OptionAbout />} />
    </Routes>
  )
}

export const SidepanelRoutingChrome = () => {
  return (
    <Routes>
      <Route path="/" element={<SidepanelChat />} />
      <Route path="/settings" element={<SidepanelSettings />} />
    </Routes>
  )
}
