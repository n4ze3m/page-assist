// this is a temp fix for firefox
// because chunks getting 4mb+ and it's not working on firefox addon store
import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

const SidepanelChat = lazy(() => import("./sidepanel-chat"))
const SidepanelSettings = lazy(() => import("./sidepanel-settings"))
const OptionIndex = lazy(() => import("./option-index"))
const OptionModal = lazy(() => import("./option-settings-model"))
const OptionPrompt = lazy(() => import("./option-settings-prompt"))
const OptionSettings = lazy(() => import("./option-settings"))
const OptionShare = lazy(() => import("./option-settings-share"))
const OptionProcessed = lazy(() => import("./option-settings-processed"))
const OptionHealth = lazy(() => import("./option-settings-health"))
const OptionKnowledgeBase = lazy(() => import("./option-settings-knowledge"))
const OptionAbout = lazy(() => import("./option-settings-about"))
const OptionRagSettings = lazy(() => import("./option-rag"))
const OptionOpenAI = lazy(() => import("./option-settings-openai"))
const OptionTldwSettings = lazy(() => import("./option-settings-tldw").then(m => ({ default: m.OptionTldwSettings })))

export const OptionRoutingFirefox = () => {
  return (
    <Routes>
      <Route path="/" element={<OptionIndex />} />
      <Route path="/settings" element={<OptionSettings />} />
      <Route path="/settings/tldw" element={<OptionTldwSettings />} />
      <Route path="/settings/model" element={<OptionModal />} />
      <Route path="/settings/prompt" element={<OptionPrompt />} />
      {/** Ollama settings removed in favor of tldw_server */}
      <Route path="/settings/openai" element={<OptionOpenAI />} />
      <Route path="/settings/share" element={<OptionShare />} />
      <Route path="/settings/processed" element={<OptionProcessed />} />
      <Route path="/settings/health" element={<OptionHealth />} />
      <Route path="/settings/knowledge" element={<OptionKnowledgeBase />} />
      <Route path="/settings/about" element={<OptionAbout />} />
      <Route path="/settings/rag" element={<OptionRagSettings />} />
    </Routes>
  )
}

export const SidepanelRoutingFirefox = () => {
  return (
    <Routes>
      <Route path="/" element={<SidepanelChat />} />
      <Route path="/settings" element={<SidepanelSettings />} />
    </Routes>
  )
}
