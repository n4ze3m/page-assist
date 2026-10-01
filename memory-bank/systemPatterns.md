# System Patterns: Page Assist

Last updated: 2026-01-13
Derived from: repo structure (src/*), wxt.config.ts, package.json

1) High-Level Architecture
- Browser Extension built with WXT (multi-target: chrome/edge, firefox) with separate entries per target; output under build/; manifest assembled in wxt.config.ts.
- UI: React 18 (sidepanel + options) with react-router; styling with Tailwind + AntD; i18n via i18next.
- Domain/Core: providers under src/models/*; persistence Dexie (db/*) + vector stores (libs/*); ingestion loaders/parser.

2) Key Modules and Responsibilities
- entries(/-firefox)/*: background, content scripts, sidepanel, options entrypoints per target.
- routes/*: UI route trees for panel and settings.
- services/*: browser API orchestration, provider glue, OCR/TTS, model settings.
- models/*: provider adapters for chat/embeddings; unify streaming and chunking.
- libs/*: parsing/extraction, PDF/Docx/Tesseract wrappers, export/import, notifications, vector stores.
- db/*: Dexie schema/models; vector persistence.
- hooks/*: chat flows, speech recognition, keyboard, messaging, i18n, utilities.
- store/*: Zustand state containers.

3) Important User Interface Composition (New)
- ChatInput system consolidation introduced under src/components/ChatInput:
  - controls/: small, focused UI controls replacing inline JSX in forms.
    - SpeechButton, StopButton, WebSearchToggle (switch|icon), ThinkingControls (ossLevels|toggle),
      UploadImageButton, UploadDocumentButton, ClearContextButton, VisionToggle, SubmitDropdown.
  - parts/: larger display assemblies replacing repeated blocks.
    - ImagePreview (image header), DocumentsBar (selected documents), FilesBar (uploaded files + retrieval toggle).
  - Hooks: useSubmitValidation (validation guards) and useKeydownHandler (Enter/Shift+Enter + IME guard).
- Integration points:
  - Sidepanel/Chat/form.tsx now delegates image header (ImagePreview), and control buttons to shared controls; prevents default on submit.
  - Option/Playground/PlaygroundForm.tsx delegates image header (ImagePreview), documents (DocumentsBar), files (FilesBar), and control buttons to shared components; prevents default on submit.

4) Styling Conventions (Updated)
- Tailwind component utilities codified in src/assets/tailwind.css:
  - .pa-card (split into base, surface, interactive states, and temporary chat variant via [data-istemporary-chat]).
  - .pa-textarea, .pa-icon-button, .pa-controls for consistent spacing and interactions.
- Use these utilities instead of long inline className strings to ensure consistent look and simplify future theme updates.

5) Behavior Patterns
- Input handling centralized via useKeydownHandler: handles Enter/Shift+Enter, Firefox/IME 'Process' key, and allows an extraGuard for mentions menu.
- Submission validation via useSubmitValidation: ensures a model is selected and embedding requirements are met (internet search, rag mode), and ignores empty submissions unless files/docs present.
- Prevent page reload: all chat forms use e.preventDefault() in onSubmit before calling submitForm.

6) Cross-Browser and Robustness
- Previous patterns remain relevant: executeScript fallbacks in Firefox PDF viewer (libs/get-html.ts), background submission dedupe and streaming guard, and embedding cache correctness on first turn.

7) Pending Consolidations
- Introduce ChatInputShell and ChatTextarea wrappers to reduce JSX duplication further, making forms a declarative composition of controls + parts + hooks.
- Consider extracting mentions assembly as an optional part if reuse/migration is beneficial.

Appendix: Key Files (UI consolidation)
- src/components/ChatInput/controls/* (all small controls)
- src/components/ChatInput/parts/{ImagePreview,DocumentsBar,FilesBar}.tsx
- src/hooks/chat-input/{useSubmitValidation,useKeydownHandler}.ts
- src/components/Sidepanel/Chat/form.tsx
- src/components/Option/Playground/PlaygroundForm.tsx
