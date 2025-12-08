import type { TFunction } from "i18next"

export type DemoFlashcardDeck = {
  id: string
  name: string
  summary: string
}

export type DemoNotePreview = {
  id: string
  title: string
  preview: string
  updated_at: string
}

export type DemoMediaPreview = {
  id: string
  title: string
  meta: string
  status: "Ready" | "Processing"
}

export const getDemoFlashcardDecks = (t: TFunction): DemoFlashcardDeck[] => [
  {
    id: "demo-deck-1",
    name: t("option:flashcards.demoSample1Title", {
      defaultValue: "Demo deck: Core concepts"
    }),
    summary: t("option:flashcards.demoSample1Summary", {
      defaultValue: "10 cards · Great for testing spacing and ratings."
    })
  },
  {
    id: "demo-deck-2",
    name: t("option:flashcards.demoSample2Title", {
      defaultValue: "Demo deck: Product terms"
    }),
    summary: t("option:flashcards.demoSample2Summary", {
      defaultValue: "8 cards · Names, acronyms, and key definitions."
    })
  },
  {
    id: "demo-deck-3",
    name: t("option:flashcards.demoSample3Title", {
      defaultValue: "Demo deck: Meeting follow-ups"
    }),
    summary: t("option:flashcards.demoSample3Summary", {
      defaultValue: "6 cards · Example action items to review."
    })
  }
]

export const getDemoNotes = (t: TFunction): DemoNotePreview[] => [
  {
    id: "demo-note-1",
    title: t("option:notesEmpty.demoSample1Title", {
      defaultValue: "Demo note: Weekly meeting recap"
    }),
    preview: t("option:notesEmpty.demoSample1Preview", {
      defaultValue:
        "Decisions, blockers, and follow-ups from a recent team sync."
    }),
    updated_at: t("option:notesEmpty.demoSample1Meta", {
      defaultValue: "Today · 9:32 AM"
    })
  },
  {
    id: "demo-note-2",
    title: t("option:notesEmpty.demoSample2Title", {
      defaultValue: "Demo note: Research highlights"
    }),
    preview: t("option:notesEmpty.demoSample2Preview", {
      defaultValue:
        "Key insights pulled from a long article or paper."
    }),
    updated_at: t("option:notesEmpty.demoSample2Meta", {
      defaultValue: "Yesterday · 4:10 PM"
    })
  },
  {
    id: "demo-note-3",
    title: t("option:notesEmpty.demoSample3Title", {
      defaultValue: "Demo note: Call summary"
    }),
    preview: t("option:notesEmpty.demoSample3Preview", {
      defaultValue:
        "Summary of a customer call with next steps and owners."
    }),
    updated_at: t("option:notesEmpty.demoSample3Meta", {
      defaultValue: "This week"
    })
  }
]

export const getDemoMediaItems = (): DemoMediaPreview[] => [
  {
    id: "demo-media-1",
    title: "Sample media item 1",
    meta: "Video · 12:34",
    status: "Ready"
  },
  {
    id: "demo-media-2",
    title: "Sample media item 2",
    meta: "Audio · 08:12",
    status: "Processing"
  },
  {
    id: "demo-media-3",
    title: "Sample media item 3",
    meta: "PDF · 4 pages",
    status: "Ready"
  }
]

