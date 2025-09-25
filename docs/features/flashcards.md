---
title: Flashcards (Experimental)
---

# Flashcards (Experimental)

The Flashcards page lets you create, review, and manage spaced‑repetition cards backed by your tldw_server. It also supports CSV/TSV import and export (and optional .apkg export where supported by the server).

Access it from the Web UI header by clicking the Layers icon, or navigate to `/flashcards`.

## Prerequisites

- The extension must be connected to a running tldw_server instance (Options → Settings → tldw Server).
- You need to be signed in or configured with an API key if your server requires authentication.

## Tabs

- Review: Fetches the next due card (optionally by deck), reveals the answer, and lets you submit an Anki‑style 0–5 rating. The server schedules the next review via `/api/v1/flashcards/review`.
- Create: Choose a deck (or create one), set Model Type (`basic`, `basic_reverse`, `cloze`), toggles (Reverse/Cloze), add tags and content, then create via `/api/v1/flashcards`.
- Manage: Search/filter by deck/tag/due status, paginate, edit cards (PATCH), or delete them (DELETE with expected version).
 - Manage: Search/filter by deck/tag/due status, paginate, select multiple, bulk move/delete/export (CSV/TSV), edit cards (PATCH), or delete them (DELETE with expected version).
- Import/Export:
  - Import: Paste TSV/CSV lines with columns `Deck, Front, Back, Tags, Notes`. Choose delimiter and header presence. Uses `/api/v1/flashcards/import`. Limits can be inspected via `/api/v1/config/flashcards-import-limits`.
  - Export: Filter by deck/tag/query, choose CSV/TSV (and optional .apkg), set options like delimiter, header, and extended columns, then download.
  - Optional import column mapping lets you re-order your columns to match the server’s expected `Deck, Front, Back, Tags, Notes` shape.

## Tips

- Due cards: Use the Review tab’s “Next due” to step through scheduled cards.
- Cloze cards: Toggle “Is Cloze” and select `cloze` model when creating/editing.
- Tags: Use the tags input in Create/Edit; tags are stored as a JSON array.

> Note: Flashcards features are marked Experimental in the server API and may change.
