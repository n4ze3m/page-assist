# Actor UX PRD – Scene Director (Actor)

## 1. Summary

Redesign the **Scene Director (Actor)** sidebar/modal into a focused, low-friction tool for shaping scene context across chats. The new UX uses a **“blade” layout** (one primary section open at a time) to reduce cognitive load, while still exposing powerful features such as dynamic aspects, lore/worldbook binding, GM-only notes, prompt placement controls, and dictionary tokens.

The implementation should reuse existing Actor logic (settings schema, store, injection, presets, per-character defaults) and primarily restructure the UI/interaction patterns around it.

## 2. Goals & Non‑Goals

### 2.1 Goals

- Make Actor **easy to understand at a glance**:
  - Is Actor on/off for this chat?
  - What is it currently influencing (aspects + notes)?
  - Where in the prompt is it injected?
- Reduce perceived complexity with a **blade-based layout**:
  - Only one detailed section is open at any time.
  - Other sections collapse into concise, informative headers.
- Support **efficient editing workflows**:
  - Quickly add/remove aspects focused on user/char/world.
  - Bind aspects to lore/worldbook entries without leaving the panel.
  - Capture GM-only notes with Markdown+LaTeX preview.
- Maintain **clarity about scope and defaults**:
  - Clearly indicate per-chat Actor settings versus per-character defaults.
  - Provide obvious actions to apply/reset presets and character profiles.
- Improve **prompt placement and diagnostics**:
  - Make chatPosition/chatDepth/chatRole controls understandable and safe.
  - Surface token estimates and Actor dictionary tokens with copy affordances.

### 2.2 Non‑Goals

- Do not redesign the underlying **Actor content model or injection logic** beyond what is already covered by the main Actor PRD (aspects, notes, templateMode, etc.).
- Do not introduce new scene template engines; only expose existing `templateMode` and placement options in a clearer way.
- Do not change storage backends or the per-chat/per-character Actor persistence model, except as needed to support new UI fields already defined by the Actor schema.

## 3. Users & Use Cases

### 3.1 Primary Users

- **Story-focused players / GMs**
  - Use Actor to control outfits, mood, environment, and meta-notes per scene.
  - Need a clear “control panel” that doesn’t feel like managing a spreadsheet.
- **Power users / tinkerers**
  - Configure many aspects with lore bindings.
  - Care about token usage and prompt placement.

### 3.2 Core Use Cases

1. **Quickly tune a scene**
   - Turn Actor on for a chat.
   - Adjust 3–5 aspects (e.g., user mood, char outfit, weather).
   - Add a short note about tone.
2. **Bind aspects to lore/worldbooks**
   - Create aspects anchored to worldbooks and entries (e.g., “Mood” from `director_world`).
   - Be resilient when entries are missing/renamed.
3. **Manage long‑running campaigns**
   - Save per-character defaults for Actor.
   - Start new chats with sensible seeded settings.
4. **Debug behavior**
   - Understand where Actor is injected (before/after/depth).
   - See how many tokens Actor adds and which dictionary tokens are available.

## 4. Scope

### 4.1 In Scope

- **ActorEditor** (primary editor component).
- **Actor usage within:**
  - `CurrentChatModelSettings` (Chat Settings modal).
  - `ActorPopout` (floating drawer/pop-out).
- Layout, copy, and interaction refinements for:
  - Aspects management (add/remove, enable/disable, reordering).
  - Lore/worldbook binding UI.
  - Notes + GM-only + Markdown+LaTeX preview.
  - Placement (chatPosition, chatDepth, chatRole).
  - Template interaction (`templateMode`).
  - Token estimate + dictionary tokens list + copy buttons.
- Blade interaction model (one section open at a time).

### 4.2 Out of Scope

- New functional features beyond what the Actor PRD already defines (e.g., new aspect types, new template systems).
- Back-end changes to worldbooks, tokenization, or chat modes beyond what is already implemented for Actor.

## 5. Experience Overview

Actor appears in two primary surfaces:

1. **Chat Settings modal** – Actor occupies a dedicated section titled “Scene Director (Actor)”.
2. **Actor Popout** – A floating drawer able to mirror and edit the same per-chat Actor state.

Both surfaces share a **single cohesive ActorEditor**:

- Top: **Context & Status** (enabled switch, scope/profile info, presets/default actions).
- Middle: **Blade Stack** (Aspects, Notes, Placement, Tokens) – only one active at a time.
- Bottom: **Subtle diagnostics** (warning banners, optional docs link).

The visual and interaction model should be consistent between modal and popout, with layout adapted to width where necessary.

## 6. Information Architecture & Blades

### 6.1 Blades

- Blades represent logical sections:
  - `Aspects`
  - `Scene notes`
  - `Placement & templates`
  - `Tokens & variables`
- At most **one blade is expanded** at a time; others are collapsed into header rows.

### 6.2 Blade Headers (Collapsed State)

Each collapsed blade header row must provide:

- **Title** (e.g., “Aspects”).
- **Summary** based on current data:
  - Aspects: `6 aspects · 2 disabled · 3 lore-bound`.
  - Notes: `GM-only · 142 characters` or `Empty`.
  - Placement: `"Before main prompt"` or `"Depth 3 · Role: System"`.
  - Tokens: `Estimated 184 tokens · 10 tokens`.
- **Chevron icon** indicating expand/collapse state.
- Click/tap target for activation.
- Accessibility:
  - `role="button"`, `tabIndex={0}`, `aria-expanded={true|false}`.
  - Space/Enter activates the blade.

Activation behavior:

- Clicking a collapsed blade expands it and collapses the previously active blade.
- Focus should move to the first interactive control in the newly activated blade.

### 6.3 Blade Content (Expanded State)

Expanded blades show full controls for that section in a card-like container with padding and subtle border/outline.

The **order of blades** in the stack should be:

1. Aspects (default active).
2. Scene notes.
3. Placement & templates.
4. Tokens & variables.

## 7. Detailed UX Requirements

### 7.1 Top Zone: Context & Status

#### 7.1.1 Header

- Title: **“Scene Director (Actor)”**.
- Subtitle: `Chat: <chat name> · Character: <character name>` (truncated with tooltip on hover).
- Right side: primary **Enabled** toggle:
  - Label: “Enabled”.
  - States: On / Off.
  - Tooltip: “Controls whether Actor influences this chat.”
  - When Off:
    - All content remains visible but visually dimmed.
    - Preview and token sections indicate “Actor is off for this chat.”

#### 7.1.2 Scope & Profiles

- A compact info row under the header:
  - `Scope: This chat` (non-editable description).
  - If a per-character profile is in use:
    - Badge: `Using <Character> default` with tooltip “This chat was seeded from <Character>’s Actor profile.”

#### 7.1.3 Presets & Defaults

- Provide three inline actions (button or link-style with icons):
  - `Apply preset…` (opens preset selector / uses existing presets).
  - `Save as <Character> default` (writes the current Actor settings as the character’s profile).
  - `Reset for this chat` (resets Actor settings to default for this chat).
- These actions should be clearly visible but not visually heavy (secondary style).

### 7.2 Aspects Blade

#### 7.2.1 Layout

- Display aspects as **cards in a vertical list**:
  - Each card corresponds to a single `ActorAspect`.
  - Soft card styling (light background, subtle border, no heavy chrome).

#### 7.2.2 Card Content

Each aspect card must show:

- **Name** (editable text input) – e.g., “User Mood”.
- **Target entity** badge:
  - Options: `User`, `Char`, `World`.
  - Either a pill-style selector or a small dropdown.
- **Source** selector:
  - Options: `Free text`, `Lore entry`.
- **Value editor**:
  - If `Free text`:
    - Single-line input or compact textarea.
  - If `Lore entry`:
    - Two fields:
      - `Worldbook` (select from known worldbooks / lorebooks).
      - `Entry` (select from entries for that book).
- **Status line**:
  - E.g., `From director_world · Mood`, or `Free text value only`.
- **Token preview** (optional, if dictionary key defined):
  - Monospace token (e.g., `[[actor_user_mood]]`) with a copy icon.

#### 7.2.3 Card Chrome & Actions

- Left side: drag handle for reorder.
- Right side:
  - Enable/disable toggle (eye icon).
  - Delete icon (trash).
  - Deletion should confirm if the aspect is lore-bound or heavily edited (to avoid accidental loss).

#### 7.2.4 Add Aspect

- Button at the end of the list: `+ Add aspect`.
- On click, show a small dialog or inline row:
  - “Who is this about?”: options `User`, `Char`, `World`.
  - “Label” input.
  - Optional initial source: `Free text` (default) or `Lore entry`.
- After confirmation, the new aspect appears as a card and enters edit mode.

#### 7.2.5 Soft Limits & Warnings

- When aspect count exceeds the configured soft limit (e.g., 20):
  - Show an inline banner at the top of the Aspects blade:
    - “You are using 23 aspects. This may increase token usage and latency.”
  - Non-blocking; no modals.

#### 7.2.6 Lore / Worldbook Resilience

- For lore-bound aspects where the chosen entry cannot be found:
  - Show a small inline error within the card:
    - “Lore entry not found. Using free text instead.”
  - Automatically switch the source to `Free text` with the last known value preserved if possible.

### 7.3 Scene Notes Blade

#### 7.3.1 Notes Input

- Label: “Scene notes”.
- Helper text: “High-level notes about tone, pacing, or goals.”
- Large textarea for `actorNotes`.

#### 7.3.2 GM-only Toggle

- Checkbox inline with the label:
  - Text: “GM-only (not sent to the model)”.
- When checked:
  - The preview below should display a small badge:
    - `GM-only – not included in prompt`.
  - This visually reinforces that notes are **view-only** for the user and are not injected into the model.

#### 7.3.3 Preview Modes

- Below the textarea, provide a **preview mode switch**:
  - Options: `Raw` | `Markdown + LaTeX`.
- Raw:
  - Shows plain text in a read-only area.
- Markdown + LaTeX:
  - Uses the existing Markdown renderer with LaTeX support.
  - Rendered inside a simple bordered box, scrollable if long.
- The underlying stored value is always raw text; preview is purely visual.

### 7.4 Placement & Templates Blade

#### 7.4.1 Chat Position

- Section label: “Placement in prompt”.
- Radio group options:
  - `Before main prompt` → maps to `chatPosition = "before"`.
  - `After main prompt` → maps to `chatPosition = "after"`.
  - `In chat at depth` → maps to `chatPosition = "depth"`.
- For `In chat at depth`:
  - Inline numeric input for `Depth` (0–999).
  - Dropdown for `Role` with options:
    - `System`, `User`, `Assistant`.
  - Helper text: “0 is earliest; 999 is latest. Out-of-range values are clamped.”

#### 7.4.2 Template Interaction

- Section label: “When scene templates are active”.
- Single select for `Template interaction`:
  - Options:
    - `Merge` – “Combine Actor with templates.”
    - `Override` – “Let Actor override overlapping template details.”
    - `Ignore` – “Skip Actor when templates are active.”
- Additional helper text may reference docs if available.

### 7.5 Tokens & Variables Blade

#### 7.5.1 Token Estimate

- Show an **estimated token count** for the Actor prompt:
  - “Estimated tokens: 184”.
- When count exceeds configured threshold (e.g., 512):
  - Change text color to warning state.
  - Show subtext: “This may significantly affect cost and latency. Consider simplifying aspects or notes.”

#### 7.5.2 Actor Tokens List

- Group tokens by entity:
  - “User tokens”: list of `[[actor_user_*]]`.
  - “Char tokens”.
  - “World tokens`.
- Each token row:
  - Token in monospace (non-editable).
  - Small copy-to-clipboard button with icon and tooltip “Copy token”.
  - Successful copy should briefly show inline feedback (e.g., “Copied”).

#### 7.5.3 Docs Link

- Provide a small link at the end:
  - “Learn how to use Actor variables” (opens relevant docs page if available).

## 8. State, Persistence & Performance

### 8.1 Shared State

- ActorEditor should continue to use the centralized **Actor store** (e.g., Zustand) so:
  - Chat Settings modal and Actor Popout share live in-memory state.
  - Changes in one surface are reflected in the other without extra fetches.

### 8.2 Debounced Computations

- Recompute Actor preview and token count using a **debounce (e.g., 150–300ms)** on form changes.
- Show a subtle “Updating…” state only if recomputation takes noticeable time.

### 8.3 Validation

- Inputs for `chatDepth` must be clamped to [0, 999].
- Aspect count soft limit and token warning must rely on the configured constants, not hard-coded values.
- Missing lore entries must be handled gracefully as described (fallback to free text + inline warning).

## 9. Accessibility

- All interactive elements (blade headers, switches, radios, selects, buttons) must be:
  - Keyboard-focusable.
  - Usable with Space/Enter where appropriate.
  - Labeled with clear, localized text.
- Blade headers:
  - Use `aria-expanded` reflecting state.
  - Ensure switching blades moves focus to the new section’s first field.
- Color usage:
  - Warnings and statuses must not rely only on color; include text indicators.

## 10. Visual & Responsive Behavior

- **Modal layout**:
  - ActorEditor fills available modal width with a single column of blades.
  - Content scrolls within the modal body; modal header remains fixed.
- **Popout layout**:
  - Popout width should comfortably fit the blades (approx. 420–480px).
  - Same blade behavior as in the modal.
- Use consistent typography, spacing, and colors aligned with the rest of the extension.

## 11. Success Criteria

- Users can:
  - Tell within 3 seconds if Actor is on or off for the current chat.
  - Locate and edit a specific aspect in ≤ 2 clicks from opening the Actor panel.
  - Understand where Actor is placed in the prompt and how to adjust it.
  - Copy an Actor token in ≤ 2 interactions (hover → click copy).
- Qualitative feedback:
  - Reduced confusion about “what Actor is doing” in usability tests.
  - Fewer user reports about Actor being “mysterious” or “too complex.”

## 12. Open UX Questions

These can be refined during design review but do not block initial implementation:

1. Should the **active blade** persist per-surface (modal vs popout) or globally per chat?
2. Do we want a **quick “Collapse all”** action or is single active blade sufficient?
3. Should we surface a **“last updated”** timestamp for Actor settings to help users understand when they last changed context?

These should be resolved with product/UX stakeholders before final polishing but can be implemented with reasonable defaults (e.g., local blade state, no global “collapse all”) in the first iteration.

