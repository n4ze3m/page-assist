# Sidebar Features

Use the sidebar to ingest content quickly, triage media, and trigger helper actions without leaving the current tab.

## Ways to open
- Toolbar button: click the tldw Assistant icon (configurable to open Web UI instead).
- Context menu: right-click a page and pick the sidebar action.
- Keyboard shortcut: `Ctrl+Shift+Y` by default (browser shortcut settings control this).

## Context menu actions
- **Open Sidebar / Open Web UI**: choose your preference under Settings → System → Context Menu Action.
- **Send to tldw_server**: push the current page or link to `/api/v1/media/add` for server-side ingest.
- **Process (no server save)**: run extract/analysis locally via `/api/v1/media/process-*` without storing on the server.
- **Transcribe Video/Audio**: send an audio/video URL for transcription and view the transcript in the sidebar/Media view.
- **Transcribe + Summarize Video/Audio**: transcribe and generate a summary; results are delivered to the sidebar and stored under Media.
- **Selection helpers**: Summarize, Explain, Rephrase, Translate, and Custom for highlighted text; they open the sidebar and send the selection into chat.

## Core chat capabilities
- **Chat with Website (RAG)**: toggle the “chat with website” switch in the composer to ground replies on the current page (see `/sidebar/chat-with-website.md` for setup and RAG/normal mode defaults).
- **Vision**: enable the eye icon in the composer to let vision-capable models “see” the page; optional OCR fallback for non-vision models (`/sidebar/vision.md`).
- **Drop images**: drag-and-drop images into the chat area to ask about screenshots.
- **History & temp chats**: clear history, start a temporary chat, and browse chat history from the header controls.
- **Character chat**: pick a saved character/persona from the header selector to chat in that persona.

## Quick ingest (header menu)
- In the sidebar header, click **Ingest** to submit the active tab:
  - **Save current page on server**: ingest + store (equivalent to Send to tldw_server).
  - **Process current page locally**: analyze without storing (equivalent to Process (no server save)).
- The Web UI **Quick ingest** modal supports URLs and file uploads with advanced options (chunking, OCR, diarization, captions).

## Navigation shortcuts in header
- Open Web UI sections directly: Chat, Media (`#/media`), Review (`#/media-multi`), Knowledge, Notes, Prompts, Flashcards.
- Model and settings shortcuts: model settings, prompt manager, and options/settings links are one click away.

## Viewing results
- **Media view** (`#/media`): browse stored items, including transcripts and summaries.
- **Review view** (`#/media-multi`): multi-select media/notes for structured analysis.
- **Sidebar chat**: receives outputs from context actions (e.g., selection helpers, transcribe) and lets you continue the conversation.

## Requirements
- A configured and online tldw server (Settings → tldw server).
- Appropriate API key or auth token for your mode (single-user or multi-user).
- Permissions to run the sidebar in your browser (some browsers disable sidebars in private windows).
