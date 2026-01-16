// this is a temp fix for firefox
// because chunks getting 4mb+ and it's not working on firefox addon store
import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

const SidepanelChat = lazy(() => import("./sidepanel-chat"))
const SidepanelSettings = lazy(() => import("./sidepanel-settings"))
const SidepanelSettingsOpenAI = lazy(
  () => import("./sidepanel-settings-openai")
)
const SidepanelSettingsModel = lazy(() => import("./sidepanel-settings-model"))

const OptionIndex = lazy(() => import("./settings/option-index"))
const OptionModal = lazy(() => import("./settings/option-settings-model"))
const OptionPrompt = lazy(() => import("./settings/option-settings-prompt"))
const OptionOllamaSettings = lazy(
  () => import("./settings/options-settings-ollama")
)
const OptionSettings = lazy(() => import("./settings/option-settings"))
const OptionShare = lazy(() => import("./settings/option-settings-share"))
const OptionKnowledgeBase = lazy(
  () => import("./settings/option-settings-knowledge")
)
const OptionAbout = lazy(() => import("./settings/option-settings-about"))
const OptionRagSettings = lazy(() => import("./settings/option-rag"))
const OptionOpenAI = lazy(() => import("./settings/option-settings-openai"))

const SettingsLayout = lazy(() =>
  import("./SettingsLayout").then((module) => ({
    default: module.SettingsLayout
  }))
)

export const OptionRoutingFirefox = () => {
  return (
    <Routes>
      <Route path="/" element={<OptionIndex />} />
      <Route path="/settings/*" element={<SettingsLayout />}>
        <Route path="" element={<OptionSettings />} />
        <Route path="model" element={<OptionModal />} />
        <Route path="prompt" element={<OptionPrompt />} />
        <Route path="ollama" element={<OptionOllamaSettings />} />
        <Route path="openai" element={<OptionOpenAI />} />
        <Route path="share" element={<OptionShare />} />
        <Route path="knowledge" element={<OptionKnowledgeBase />} />
        <Route path="about" element={<OptionAbout />} />
        <Route path="rag" element={<OptionRagSettings />} />
      </Route>
    </Routes>
  )
}

export const SidepanelRoutingFirefox = () => {
  return (
    <Routes>
      <Route path="/" element={<SidepanelChat />} />
      <Route path="/settings" element={<SidepanelSettings />} />
      <Route path="/settings/openai" element={<SidepanelSettingsOpenAI />} />
      <Route path="/settings/model" element={<SidepanelSettingsModel />} />
    </Routes>
  )
}
