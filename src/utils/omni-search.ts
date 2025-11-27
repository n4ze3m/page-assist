export type OmniSearchEntityType =
  | 'screen'
  | 'chat'
  | 'media'
  | 'note'
  | 'flashcards'
  | 'prompt'

// Replace this with your actual icon type (e.g., from your design system)
export type IconType = string

export interface ScreenDefinition {
  id: string
  label: string
  description?: string
  icon: IconType
  route: string
  keywords?: string[]
}

export interface ChatSummary {
  id: string
  title: string
  lastMessageSnippet?: string
  lastUpdatedAt?: string
}

export interface MediaItemSummary {
  id: string
  title: string
  source?: string
  durationSeconds?: number
  createdAt?: string
}

export interface NoteSummary {
  id: string
  title: string
  snippet?: string
  updatedAt?: string
}

export interface FlashcardCollectionSummary {
  id: string
  name: string
  cardCount?: number
  lastReviewedAt?: string
}

export interface PromptSummary {
  id: string
  name: string
  snippet?: string
  lastUsedAt?: string
}

export interface OmniSearchResultBase {
  id: string
  type: OmniSearchEntityType
  label: string
  subtitle?: string
  icon: IconType
}

export interface OmniSearchResult extends OmniSearchResultBase {
  onSelect: () => void
}

export interface OmniSearchSection<T extends OmniSearchEntityType = OmniSearchEntityType> {
  type: T
  label: string
  results: OmniSearchResult[]
  hasMore?: boolean
}

export interface OmniSearchQuery {
  raw: string
  normalized: string
  filterType?: OmniSearchEntityType
}

export interface OmniSearchOptions {
  limitPerSection?: number
}

export interface OmniSearchResponse {
  query: OmniSearchQuery
  sections: OmniSearchSection[]
}

export type ScreenSearchFn = (query: OmniSearchQuery) => Promise<ScreenDefinition[]>

export type ChatSearchFn = (query: OmniSearchQuery) => Promise<ChatSummary[]>

export type MediaSearchFn = (query: OmniSearchQuery) => Promise<MediaItemSummary[]>

export type NoteSearchFn = (query: OmniSearchQuery) => Promise<NoteSummary[]>

export type FlashcardSearchFn = (
  query: OmniSearchQuery
) => Promise<FlashcardCollectionSummary[]>

export type PromptSearchFn = (query: OmniSearchQuery) => Promise<PromptSummary[]>

export interface OmniSearchDependencies {
  searchScreens: ScreenSearchFn
  searchChats: ChatSearchFn
  searchMedia: MediaSearchFn
  searchNotes: NoteSearchFn
  searchFlashcards: FlashcardSearchFn
  searchPrompts: PromptSearchFn
  navigateToScreen: (screenId: string) => void
  openChat: (chatId: string) => void
  openMediaItem: (mediaId: string) => void
  openNote: (noteId: string) => void
  openFlashcardCollection: (collectionId: string) => void
  openPrompt: (promptId: string) => void
}

export function parseOmniSearchQuery(raw: string): OmniSearchQuery {
  const trimmed = raw.trim()

  // In v1, type-prefix parsing (e.g., "n: query") is disabled by default.
  // It can be enabled later via feature flags.
  if (!defaultOmniSearchFlags.enableTypePrefixes) {
    return {
      raw,
      normalized: trimmed.toLowerCase()
    }
  }

  const match = /^(\w+):\s*(.*)$/i.exec(trimmed)

  if (!match) {
    return {
      raw,
      normalized: trimmed.toLowerCase()
    }
  }

  const [, prefix, rest] = match
  const normalizedPrefix = prefix.toLowerCase()

  const prefixMap: Record<string, OmniSearchEntityType> = {
    s: 'screen',
    screen: 'screen',
    c: 'chat',
    chat: 'chat',
    m: 'media',
    n: 'note',
    note: 'note',
    f: 'flashcards',
    p: 'prompt'
  }

  const filterType = prefixMap[normalizedPrefix]

  if (!filterType) {
    return {
      raw,
      normalized: trimmed.toLowerCase()
    }
  }

  return {
    raw,
    normalized: rest.trim().toLowerCase(),
    filterType
  }
}

export async function omniSearch(
  rawQuery: string,
  deps: OmniSearchDependencies,
  options: OmniSearchOptions = {}
): Promise<OmniSearchResponse> {
  const query = parseOmniSearchQuery(rawQuery)
  const limitPerSection = options.limitPerSection ?? 3

  const shouldSearchType = (type: OmniSearchEntityType) =>
    !query.filterType || query.filterType === type

  const [screens, chats, mediaItems, notes, flashcards, prompts] = await Promise.all([
    shouldSearchType('screen') ? deps.searchScreens(query) : Promise.resolve([]),
    shouldSearchType('chat') ? deps.searchChats(query) : Promise.resolve([]),
    shouldSearchType('media') ? deps.searchMedia(query) : Promise.resolve([]),
    shouldSearchType('note') ? deps.searchNotes(query) : Promise.resolve([]),
    shouldSearchType('flashcards')
      ? deps.searchFlashcards(query)
      : Promise.resolve([]),
    shouldSearchType('prompt') ? deps.searchPrompts(query) : Promise.resolve([])
  ])

  const sections: OmniSearchSection[] = []

  if (screens.length) {
    sections.push({
      type: 'screen',
      label: 'Screens',
      results: screens.slice(0, limitPerSection).map((screen) => ({
        id: screen.id,
        type: 'screen',
        label: screen.label,
        subtitle: screen.description,
        icon: screen.icon,
        onSelect: () => deps.navigateToScreen(screen.id)
      })),
      hasMore: screens.length > limitPerSection
    })
  }

  if (chats.length) {
    sections.push({
      type: 'chat',
      label: 'Chats',
      results: chats.slice(0, limitPerSection).map((chat) => ({
        id: chat.id,
        type: 'chat',
        label: chat.title,
        subtitle: chat.lastMessageSnippet,
        icon: 'chat',
        onSelect: () => deps.openChat(chat.id)
      })),
      hasMore: chats.length > limitPerSection
    })
  }

  if (mediaItems.length) {
    sections.push({
      type: 'media',
      label: 'Media',
      results: mediaItems.slice(0, limitPerSection).map((item) => ({
        id: item.id,
        type: 'media',
        label: item.title,
        subtitle: item.source,
        icon: 'media',
        onSelect: () => deps.openMediaItem(item.id)
      })),
      hasMore: mediaItems.length > limitPerSection
    })
  }

  if (notes.length) {
    sections.push({
      type: 'note',
      label: 'Notes',
      results: notes.slice(0, limitPerSection).map((note) => ({
        id: note.id,
        type: 'note',
        label: note.title,
        subtitle: note.snippet,
        icon: 'note',
        onSelect: () => deps.openNote(note.id)
      })),
      hasMore: notes.length > limitPerSection
    })
  }

  if (flashcards.length) {
    sections.push({
      type: 'flashcards',
      label: 'Flashcard Collections',
      results: flashcards.slice(0, limitPerSection).map((collection) => ({
        id: collection.id,
        type: 'flashcards',
        label: collection.name,
        subtitle:
          collection.cardCount != null ? `${collection.cardCount} cards` : undefined,
        icon: 'flashcards',
        onSelect: () => deps.openFlashcardCollection(collection.id)
      })),
      hasMore: flashcards.length > limitPerSection
    })
  }

  if (prompts.length) {
    sections.push({
      type: 'prompt',
      label: 'Prompts',
      results: prompts.slice(0, limitPerSection).map((prompt) => ({
        id: prompt.id,
        type: 'prompt',
        label: prompt.name,
        subtitle: prompt.snippet,
        icon: 'prompt',
        onSelect: () => deps.openPrompt(prompt.id)
      })),
      hasMore: prompts.length > limitPerSection
    })
  }

  return { query, sections }
}

export type OmniSearchInvokeSource = 'shortcut' | 'click' | 'programmatic'

export interface OmniSearchTelemetryHandlers {
  onSearchInvoked?: (payload: {
    source: OmniSearchInvokeSource
  }) => void
  onResultSelected?: (payload: {
    type: OmniSearchEntityType
    id: string
    index: number
    sectionLabel: string
    query: string
  }) => void
  onNoResults?: (payload: { query: string }) => void
}

export interface OmniSearchFeatureFlags {
  enableTypePrefixes: boolean
  enableAlternateActions: boolean
  enableContextualBoosts: boolean
  enableShowMorePerSection: boolean
}

export const defaultOmniSearchFlags: OmniSearchFeatureFlags = {
  enableTypePrefixes: false,
  enableAlternateActions: false,
  enableContextualBoosts: false,
  enableShowMorePerSection: false
}

