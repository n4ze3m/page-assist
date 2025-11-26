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
const OptionMedia = lazy(() => import("./option-media"))
const OptionMediaMulti = lazy(() => import("./option-media-multi"))
const OptionNotes = lazy(() => import("./option-notes"))
const OptionCharacters = lazy(() => import("./option-settings-characters"))
const OptionWorldBooks = lazy(() => import("./option-settings-world-books"))
const OptionDictionaries = lazy(() => import("./option-settings-dictionaries"))
const OptionTldwSettings = lazy(() => import("./option-settings-tldw").then(m => ({ default: m.OptionTldwSettings })))
const OptionFlashcards = lazy(() => import("./option-flashcards"))
const OptionWorldBooksWorkspace = lazy(() => import("./option-world-books"))
const OptionDictionariesWorkspace = lazy(() => import("./option-dictionaries"))
const OptionCharactersWorkspace = lazy(() => import("./option-characters"))
const OptionPromptsWorkspace = lazy(() => import("./option-prompts"))
const OptionKnowledgeWorkspace = lazy(() => import("./option-knowledge"))
const OptionTts = lazy(() => import("./option-tts"))
const OptionStt = lazy(() => import("./option-stt"))
const OptionEvaluations = lazy(() => import("./option-evaluations"))
const OptionSettingsEvaluations = lazy(() => import("./option-settings-evaluations"))
const OptionPromptStudio = lazy(() => import("./option-prompt-studio"))
const OptionSettingsPromptStudio = lazy(() => import("./option-settings-prompt-studio"))

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
      <Route path="/settings/characters" element={<OptionCharacters />} />
      <Route path="/settings/world-books" element={<OptionWorldBooks />} />
      <Route path="/settings/chat-dictionaries" element={<OptionDictionaries />} />
      <Route path="/settings/evaluations" element={<OptionSettingsEvaluations />} />
      <Route path="/settings/prompt-studio" element={<OptionSettingsPromptStudio />} />
      <Route path="/settings/about" element={<OptionAbout />} />
      <Route path="/settings/rag" element={<OptionRagSettings />} />
      <Route path="/review" element={<OptionMediaMulti />} />
      <Route path="/flashcards" element={<OptionFlashcards />} />
      <Route path="/media" element={<OptionMedia />} />
      <Route path="/media-multi" element={<OptionMediaMulti />} />
      <Route path="/notes" element={<OptionNotes />} />
      <Route path="/knowledge" element={<OptionKnowledgeWorkspace />} />
      <Route path="/world-books" element={<OptionWorldBooksWorkspace />} />
      <Route path="/dictionaries" element={<OptionDictionariesWorkspace />} />
      <Route path="/characters" element={<OptionCharactersWorkspace />} />
      <Route path="/prompts" element={<OptionPromptsWorkspace />} />
      <Route path="/prompt-studio" element={<OptionPromptStudio />} />
      <Route path="/tts" element={<OptionTts />} />
      <Route path="/stt" element={<OptionStt />} />
      <Route path="/evaluations" element={<OptionEvaluations />} />
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
