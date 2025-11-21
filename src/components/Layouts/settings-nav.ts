import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  BookIcon,
  BookMarked,
  BookOpen,
  BookText,
  BrainCircuitIcon,
  ChromeIcon,
  CombineIcon,
  CpuIcon,
  InfoIcon,
  OrbitIcon,
  ServerIcon,
  ShareIcon,
  Layers,
  StickyNote,
  Microscope,
  FlaskConical
} from "lucide-react"

export type SettingsNavItem = {
  to: string
  icon: LucideIcon
  labelToken: string
  beta?: boolean
}

export type SettingsNavGroup = {
  key: string
  titleToken: string
  items: SettingsNavItem[]
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    key: "server",
    titleToken: "settings:navigation.serverAndAuth",
    items: [
      { to: "/settings/tldw", icon: ServerIcon, labelToken: "settings:tldw.serverNav" },
      { to: "/settings", icon: OrbitIcon, labelToken: "settings:generalSettings.title" },
      { to: "/settings/rag", icon: CombineIcon, labelToken: "settings:rag.title" },
      {
        to: "/settings/chrome",
        icon: ChromeIcon,
        labelToken: "settings:chromeAiSettings.title",
        beta: true
      },
      { to: "/settings/openai", icon: CpuIcon, labelToken: "openai:settings" },
      { to: "/settings/model", icon: BrainCircuitIcon, labelToken: "settings:manageModels.title" },
      { to: "/settings/evaluations", icon: FlaskConical, labelToken: "settings:evaluationsSettings.title", beta: true },
      { to: "/settings/prompt-studio", icon: Microscope, labelToken: "settings:promptStudio.nav", beta: true },
      { to: "/settings/health", icon: ActivityIcon, labelToken: "settings:healthNav" }
    ]
  },
  {
    key: "knowledge",
    titleToken: "settings:navigation.knowledgeTools",
    items: [
      { to: "/settings/knowledge", icon: BookText, labelToken: "settings:manageKnowledge.title" },
      { to: "/settings/world-books", icon: BookOpen, labelToken: "settings:worldBooksNav" },
      { to: "/settings/chat-dictionaries", icon: BookMarked, labelToken: "settings:chatDictionariesNav" },
      { to: "/settings/characters", icon: BookIcon, labelToken: "settings:charactersNav" },
      { to: "/media", icon: BookText, labelToken: "settings:mediaNav" }
    ]
  },
  {
    key: "workspace",
    titleToken: "settings:navigation.workspace",
    items: [
      { to: "/review", icon: Microscope, labelToken: "option:header.review" },
      { to: "/flashcards", icon: Layers, labelToken: "option:header.flashcards" },
      { to: "/notes", icon: StickyNote, labelToken: "option:header.notes" },
      { to: "/settings/prompt", icon: BookIcon, labelToken: "settings:managePrompts.title" },
      { to: "/settings/share", icon: ShareIcon, labelToken: "settings:manageShare.title" }
    ]
  },
  {
    key: "about",
    titleToken: "settings:navigation.about",
    items: [
      { to: "/settings/about", icon: InfoIcon, labelToken: "settings:about.title" }
    ]
  }
]
