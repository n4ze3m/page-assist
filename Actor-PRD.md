# Actor – Scene Director for Chats (PRD)

## 1. Overview

Actor is a per-chat “scene director” feature inspired by the SillyTavern Director plugin. It lets users define and dynamically adjust structured scene metadata (user/character roles and state, mood, world conditions, notes, etc.) that is injected into model prompts and exposed via chat dictionaries. Actor integrates tightly with existing lore/worldbooks and per-chat settings, is accessible both from a dedicated pop-out and from the Chat Settings modal, and supports user-configurable “aspects” rather than a hard-coded set of fields. Actor is intended for general scene tracking (not only appearance- or roleplay-centric use cases) and should remain flexible enough for storytelling, GM’ing, productivity, and other workflows.

## 2. Goals & Non-Goals

### 2.1 Goals

- Provide a first-class, per-chat “scene information” layer that the model can rely on for consistent context.
- Mirror and extend the SillyTavern Director capabilities inside this extension, using existing lore/worldbooks and chat dictionaries.
- Allow users to add, remove, and configure tracked “aspects” (e.g., roles, focus, mood, weather, objectives) for:
  - User
  - Character
  - World / environment
- Make Actor configurable in two places:
  - A floating pop-out panel for quick access while chatting.
  - A dedicated section at the bottom of the Chat Settings modal for deeper configuration.
- Persist Actor settings per-chat and keep the pop-out and Chat Settings views in sync.
- Expose Actor data to:
  - The prompt builder (for injection at configurable positions).
  - Chat dictionaries (so users can reference values via tokens/variables).

### 2.2 Non-Goals

- Do not implement a new world/lorebook system; Actor must reuse the existing lore/worldbook infrastructure.
- Do not change or replace the core prompt-building pipeline beyond adding Actor’s optional prompt segment.
- Do not add a full template language or preset system in v1 (scene presets can be future work).
- Do not add new model/provider-specific features; behavior should be provider-agnostic.

## 3. User Stories

- **US-1:** As a user, I want to set my character’s key aspects (role, emotional state, goals, and optionally appearance) so the model consistently describes them throughout the chat.
- **US-2:** As a user, I want to configure the same types of aspects for myself (the user avatar) so the model can describe my role, state, and other relevant traits.
- **US-3:** As a user, I want to define world settings (location, weather, lighting, time of day, temperature, year, etc.) so the model can keep the environment consistent.
- **US-4:** As a user, I want to add or remove these traits (“aspects”) at will so I can focus the model on what matters in a particular scene (e.g., just mood and lighting).
- **US-5:** As a user, I want to bind aspects to existing lore/worldbooks where possible so options come from curated lists instead of free text.
- **US-6:** As a user, I want to enter free-text values for aspects when I need custom descriptions not covered by a lore/worldbook entry.
- **US-7:** As a user, I want scene notes (e.g., planning/DM notes) that are separate from chat messages but still influence the model, with a clear preview of what will be sent.
- **US-8:** As a user, I want to control where Actor’s prompt is inserted (before the main prompt, after it, or at a specific depth/role in chat history) so I can match different prompt structures.
- **US-9:** As a user, I want Actor to be configurable per chat so each conversation can have independent scene settings.
- **US-10:** As a user, I want to quickly open a pop-out panel to tweak scene settings while reading or writing messages, without leaving the main chat view.
- **US-11:** As a user, I want to see how many tokens Actor’s generated prompt adds so I can manage context length.
- **US-12:** As a power user, I want Actor values exposed as chat dictionary tokens so I can reference them in my custom prompts and system messages.

## 4. Functional Requirements

### 4.1 Data Model & Persistence

- **FR-1:** Define a per-chat `ActorSettings` object stored alongside other per-chat settings.
  - `version: number` (for future migrations; start at `1`).
  - `isEnabled: boolean`
  - `aspects: ActorAspect[]`
  - `notes: string`
  - `chatPosition: 'before' | 'after' | 'depth'`
  - `chatDepth: number`
  - `chatRole: 'system' | 'user' | 'assistant'`
  - Optional: references to selected lore/worldbooks used by aspects.
  - On load, if `version` is missing or lower than current, apply a migration step that fills defaults and normalizes enums/fields.
- **FR-2:** Define `ActorAspect`:
  - `id: string` (stable per aspect, internal)
  - `key: string` (stable, user-visible token identifier; must be unique per chat, used for dictionary tokens)
  - `target: 'user' | 'char' | 'world'`
  - `name: string` (user-visible label, e.g., “Role”, “Mood”, “Location”, “Goal”)
  - `source: 'free' | 'lore'`
  - `lorebookId?: string` (if `source` is `lore`, must be a canonical ID, not a display label)
  - `entryId?: string` (canonical entry ID from the lore/worldbook system; no reliance on display names)
  - `value: string` (currently selected value / custom description)
- **FR-3:** Initialize `ActorSettings` with sensible defaults for new chats:
  - User aspects: Role, Emotional State, Focus/Objective.
  - Character aspects: Role, Emotional State, Goal.
  - World aspects: Location, Weather, Lighting, Time of Day, Scene Tone (and other general scene descriptors where supported by lore/worldbooks).
- **FR-4:** Persist `ActorSettings` per chat, including all custom aspects and bindings; restore on chat load.

### 4.2 Lore/Worldbook & Dictionary Integration

- **FR-5:** Actor must consume options from existing lore/worldbook data:
  - Provide a way to choose which worldbook or world config is used for aspects like Mood, Lighting, Season, etc., similar to `director_world.json`.
  - For each aspect with `source: 'lore'`, bind it to exactly one lore/worldbook entry via canonical IDs; no implicit merging of multiple sources.
  - When bound to a lore/worldbook entry, an aspect’s options must be derived from that entry’s content.
- **FR-6:** When a bound lore/worldbook or entry changes (e.g., deleted or renamed):
  - Actor should gracefully handle missing entries by:
    - Showing a warning state in the UI, and
    - Automatically switching the aspect to `source: 'free'` while preserving the last known `value`, and
    - Logging a one-time warning (in dev tools or logs) to aid debugging.
- **FR-7:** Actor must register its values into the chat dictionary for each chat:
  - For every aspect with a non-empty value, expose tokens like:
    - `[[actor_user_{key}]]`
    - `[[actor_char_{key}]]`
    - `[[actor_world_{key}]]`
  - `key` must be unique per chat; if a new or edited aspect would reuse an existing `key`, either:
    - Prevent the change and show a validation error, or
    - Automatically append a numeric suffix to ensure uniqueness.
  - Token values must update when the user changes aspect values.
  - Actor tokens must appear in the same UI where other chat dictionary entries are shown, grouped under an “Actor” header for discoverability.

### 4.3 Prompt Construction & Injection

- **FR-8:** Implement a pure function `buildActorPrompt(settings, worldData) -> string` that:
  - Returns an empty string if `settings.isEnabled === false` or if no aspects/notes are set.
  - Generates per-aspect lines based on `target`:
    - User: `"{{user}}'s {nameLower} is {value}."`
    - Char: `"{{char}}'s {nameLower} is {value}."`
    - World: `"The {nameLower} is {value}."`
  - Combines lines into a section:
    - If there is at least one aspect line: prefix `Scene information:\n`.
  - Appends notes if non-empty:
    - `Scene notes: {notes}` (on a new line if the scene information section exists).
- **FR-9:** Integrate Actor into the prompt-building pipeline:
  - If `buildActorPrompt` returns an empty string, prompt generation must proceed unchanged.
  - If non-empty:
    - If `chatPosition === 'before'`: insert as a block before the main prompt/story.
    - If `chatPosition === 'after'`: insert as a block after the main prompt/story but before chat history.
    - If `chatPosition === 'depth'`: insert a chat message at the configured `chatDepth` with `chatRole`; if `chatDepth` is out of range, fall back to treating it as `'after'`.
  - Behavior must be provider-agnostic and work across all supported backends.
  - Actor’s output must be plain text (no HTML); it may contain Markdown/LaTeX syntax, but it should not assume any special prompt format.
  - Example (for clarity, non-normative):
    - `Scene information:\n{{user}}'s role is project lead.\n{{char}}'s mood is annoyed.\nThe weather is light rain.\nScene notes: Use more inner monologue.\n`

### 4.4 UI: Chat Settings Modal

- **FR-10:** Add an “Actor” section at the bottom of the Chat Settings modal:
  - Toggle: `Enable Actor for this chat`.
  - When disabled:
    - Actor’s prompt must not be injected.
    - Dictionary tokens may either be omitted or treated as empty.
  - When enabled:
    - Show collapsible sub-sections:
      - User
      - Character
      - World
      - Notes
      - Chat Injection
      - Preview & Tokens
- **FR-11:** Each of User/Character/World sections must:
  - Render a list of aspect rows filtered by `target`.
  - Support:
    - Editing `name` (label).
    - Selecting `source` (`free` or `lore`).
    - If `free`: text input for `value`.
    - If `lore`: dropdowns for lore/worldbook and then entry/options.
    - Remove aspect (with confirmation if needed).
  - Provide an “Add aspect” button:
    - User chooses `target` (in cross-section control if needed) and enters `name`.
    - Optionally choose initial `source` and binding.
- **FR-12:** Notes sub-section:
  - Textarea for scene notes.
  - Below the textarea, a compact “Preview” using the existing Markdown+LaTeX renderer.
- **FR-13:** Chat Injection sub-section:
  - Radio group for `chatPosition`:
    - Before main prompt/story.
    - After main prompt/story.
    - In-chat @ depth.
  - If “In-chat @ depth” selected:
    - Numeric input for `chatDepth` (validated range).
    - Dropdown for `chatRole` (System/User/Assistant).
- **FR-14:** Preview & Tokens sub-section:
  - Read-only textarea showing the exact `buildActorPrompt` output.
  - Token counter label (`Tokens: N`) updated when preview changes.
  - Token counting must use existing tokenizer utilities and be debounced (e.g., 300–500ms) to avoid excessive recomputation for large notes.

### 4.5 UI: Pop-Out Panel

- **FR-15:** Add an Actor pop-out UI for the current chat:
  - Trigger: a button or icon near the chat input or toolbar.
  - When clicked:
    - Opens a draggable or docked panel containing the same `ActorPanel` content as in Chat Settings.
  - Closing the panel should not discard state.
- **FR-16:** The pop-out and Chat Settings modal must share the same underlying state:
  - Changes made in one are immediately reflected in the other.
  - Toggling `isEnabled` in either place updates the other’s checkbox.
  - Implementation must use a single shared store (e.g., React context or central state) rather than duplicating independent local state per view.

### 4.6 Validation & Edge Cases

- **FR-17:** Clamp `chatDepth` to a sensible range (e.g., 0 to max history length).
- **FR-18:** Default `chatRole` to `system` if an invalid value is encountered.
- **FR-19:** If all aspects and notes are empty (or all values are effectively “Disabled”), Actor must not add any text to the prompt, even if enabled.
- **FR-20:** When a lore/worldbook-based aspect has no available options (e.g., misconfigured entry), the UI should:
  - Show an error or warning state, and/or
  - Offer to convert the aspect to `free` source.
- **FR-21:** Define a soft limit on the number of active aspects per chat (e.g., 20). When the user exceeds this limit, show a warning that prompts may become large and suggest consolidating aspects.
- **FR-22:** Track the approximate token contribution of the Actor prompt; if it exceeds a configurable threshold (e.g., 512 tokens), display a clear warning and encourage the user to shorten notes or reduce aspects.

## 5. UX & Interaction Details

- **UX-1:** Actor section header should clearly indicate enabled/disabled state (e.g., tinted title or icon).
- **UX-2:** Within aspect lists, show small badges for target (`User`, `Char`, `World`) where helpful.
- **UX-3:** For lore/world-bound aspects, surface the underlying entry name/comment (e.g., “Mood (from World: Director World)”).
- **UX-4:** Provide inline hints:
  - For Notes: “Supports Markdown and LaTeX; text is sent to the model as part of the scene.”
  - For Preview & Tokens: “This is the exact text Actor will add to the prompt.”
- **UX-5:** For “Add aspect”, use a guided flow:
  - Step 1: Choose `target` (User / Character / World).
  - Step 2: Choose from a small set of common templates (Mood, Role, Location, Weather, Time of Day, etc.) or “Custom”.
  - Step 3: Default to `source: 'free'` with an optional “Bind to lore” action that opens lore/world binding controls.
- **UX-6:** Keep layout compact and scrollable so it fits well in the Chat Settings modal and pop-out.
- **UX-7:** In the aspect editor, surface each aspect’s token key (e.g., `[[actor_user_mood]]`) so users understand how to reference it in prompts, and warn before allowing destructive token key changes.

## 6. Technical Considerations

- **TC-1:** Actor must reuse existing:
  - Per-chat storage mechanisms.
  - World/lorebook retrieval APIs.
  - Chat dictionary infrastructure.
  - Token counting utilities.
  - Markdown+LaTeX renderer for notes and preview where appropriate.
- **TC-2:** `buildActorPrompt` must be implemented as a pure, side-effect-free function to simplify testing.
- **TC-3:** Prompt injection logic should be implemented as a small, composable step in the overall request-building pipeline.
- **TC-4:** Avoid large synchronous computations in UI; use debouncing for token counting.
- **TC-5:** The data model must support versioning (`ActorSettings.version`); migrations should be centralized so future schema changes do not require scattered ad-hoc fixes.

## 7. Analytics & Telemetry (Optional)

*(Optional in v1; implement only if existing telemetry patterns make it easy.)*

- Track whether Actor is enabled per chat.
- Track how many aspects users configure on average.
- Track common injection positions (before/after/depth).

## 8. Implementation Phasing

- **Phase 1 (MVP):**
  - Per-chat `ActorSettings` with `version`, `isEnabled`, `notes`, default aspects, and a single injection position (`before` or `after` main prompt).
  - Free-text aspects only (`source: 'free'`); no lore binding UI.
  - Chat Settings modal section with:
    - Enable toggle.
    - User/Character/World aspects (no add/remove yet; just defaults).
    - Notes editor + Markdown/LaTeX preview.
    - Prompt preview + debounced token counter.
  - Core `buildActorPrompt` integration and dictionary tokens using stable `key`s.
- **Phase 2:**
  - Dynamic add/remove aspects, including guided “Add aspect” flow.
  - Lore/worldbook binding per aspect (`source: 'lore'` with canonical IDs).
  - Full injection position support (`before`, `after`, `depth` with role/depth controls and fallbacks).
  - Pop-out panel, backed by shared state with Chat Settings.
  - Soft limits and warnings for many aspects or large Actor prompt size.
- **Phase 3:**
  - Per-character defaults:
    - When starting a new chat with a given character, pre-seed aspects and values from that character’s Actor profile, which can be edited independently per chat.
  - Built-in presets:
    - Provide a small set of curated presets (e.g., “Slice of life”, “Dungeon crawl”, “Romance”) that configure a standard set of aspects and example values, which users can then customize.
  - GM-only notes behavior:
    - Add an option on notes to mark them as “GM-only”; when enabled, those notes are not sent to the model and are stored only as local metadata.
  - Scene template integration:
    - Provide a per-chat preference for how Actor interacts with any existing “scene templates” feature:
      - Merge: Actor prompt is appended to template-derived scene text.
      - Override: Actor prompt takes precedence and can overwrite overlapping template content.
      - Ignore: Actor is disabled for chats that use certain templates (or vice versa).
  - Additional analytics/telemetry based on usage patterns.

## 9. Design Decisions (Former Open Questions)

- **DD-1 (Per-character defaults):** Actor will support per-character defaults (Phase 3). New chats for a character will be initialized from that character’s Actor profile, which users can then modify per chat without affecting the profile.
- **DD-2 (Presets):** Actor will include built-in presets (Phase 3) that configure common aspect sets and values, serving as starting points for users.
- **DD-3 (GM-only notes):** Actor will support a GM-only notes mode (Phase 3) where notes can be flagged as not sent to the model, remaining local-only metadata.
- **DD-4 (Scene templates interaction):** Actor will support a user preference (Phase 3) to determine interaction with existing scene templates: merge, override, or ignore.
