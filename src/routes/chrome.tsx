import { Route, Routes } from "react-router-dom"
import OptionIndex from "./option-index"
import OptionSettings from "./option-settings"
import OptionModal from "./option-settings-model"
import OptionPrompt from "./option-settings-prompt"
import OptionShare from "./option-settings-share"
import OptionProcessed from "./option-settings-processed"
import OptionHealth from "./option-settings-health"
import OptionKnowledgeBase from "./option-settings-knowledge"
import OptionAbout from "./option-settings-about"
import SidepanelChat from "./sidepanel-chat"
import SidepanelSettings from "./sidepanel-settings"
import OptionRagSettings from "./option-rag"
import { OptionTldwSettings } from "./option-settings-tldw"
import OptionMedia from "./option-media"
import OptionMediaMulti from "./option-media-multi"
import OptionNotes from "./option-notes"
import OptionWorldBooks from "./option-settings-world-books"
import OptionDictionaries from "./option-settings-dictionaries"
import OptionCharacters from "./option-settings-characters"
import OptionWorldBooksWorkspace from "./option-world-books"
import OptionDictionariesWorkspace from "./option-dictionaries"
import OptionCharactersWorkspace from "./option-characters"
import OptionPromptsWorkspace from "./option-prompts"
import OptionKnowledgeWorkspace from "./option-knowledge"
import OptionFlashcards from "./option-flashcards"
import OptionTts from "./option-tts"
import OptionEvaluations from "./option-evaluations"
import OptionStt from "./option-stt"
import OptionSettingsEvaluations from "./option-settings-evaluations"
import OptionPromptStudio from "./option-prompt-studio"
import OptionSettingsPromptStudio from "./option-settings-prompt-studio"
import OptionAdminServer from "./option-admin-server"
import OptionAdminLlamacpp from "./option-admin-llamacpp"
import OptionAdminMlx from "./option-admin-mlx"
import OptionChatSettings from "./option-settings-chat"
import OptionQuickChatPopout from "./option-quick-chat-popout"
import OptionLayout from "~/components/Layouts/Layout"
import { OnboardingWizard } from "@/components/Option/Onboarding/OnboardingWizard"

export const OptionRoutingChrome = () => {
  return (
    <Routes>
      <Route path="/" element={<OptionIndex />} />
      {/* Dedicated route for Playwright onboarding tests so they can
          exercise the wizard independently of first-run gating logic. */}
      <Route
        path="/onboarding-test"
        element={
          <OptionLayout hideHeader={true} showHeaderSelectors={false}>
            <OnboardingWizard />
          </OptionLayout>
        }
      />
      <Route path="/settings" element={<OptionSettings />} />
      <Route path="/settings/tldw" element={<OptionTldwSettings />} />
      <Route path="/settings/model" element={<OptionModal />} />
      <Route path="/settings/prompt" element={<OptionPrompt />} />
      <Route path="/settings/evaluations" element={<OptionSettingsEvaluations />} />
      {/** Chrome AI and OpenAI/custom provider settings removed; extension is tldw_server-only */}
      <Route path="/settings/chat" element={<OptionChatSettings />} />
      <Route path="/settings/share" element={<OptionShare />} />
      <Route path="/settings/processed" element={<OptionProcessed />} />
      <Route path="/settings/health" element={<OptionHealth />} />
      <Route path="/settings/prompt-studio" element={<OptionSettingsPromptStudio />} />
      <Route path="/settings/knowledge" element={<OptionKnowledgeBase />} />
      <Route path="/settings/characters" element={<OptionCharacters />} />
      <Route path="/settings/world-books" element={<OptionWorldBooks />} />
      <Route path="/settings/chat-dictionaries" element={<OptionDictionaries />} />
      <Route path="/settings/rag" element={<OptionRagSettings />} />
      <Route path="/settings/about" element={<OptionAbout />} />
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
      <Route path="/admin/server" element={<OptionAdminServer />} />
      <Route path="/admin/llamacpp" element={<OptionAdminLlamacpp />} />
      <Route path="/admin/mlx" element={<OptionAdminMlx />} />
      <Route path="/quick-chat-popout" element={<OptionQuickChatPopout />} />
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
