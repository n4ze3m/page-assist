# Feature: Screenshots + high-leverage upgrades

Roadmap for turning `page-action-mcp` into a best-in-class page-action MCP. Nothing
here is implemented yet — this is the spec/sequencing doc.

Two repos are involved:
- `page-action-mcp` — the extension (server side, CDP tools).
- `page-assist-2` — the consumer (LLM tool loop in `src/libs/mcp/normal-chat.ts`).

---

## Part 1 — Screenshots (vision)

### The core problem

MCP tool results are text-only *the way page-assist-2 consumes them today*. A tool can
legally return an image block:

```jsonc
{ "content": [{ "type": "image", "data": "<base64>", "mimeType": "image/png" }] }
```

but `page-assist-2/src/libs/mcp/http-client.ts` → `readToolContent` collapses
`type: "image"` to the literal string `"[Image output: image/png]"`. So a returned
screenshot never reaches the model as pixels. A screenshot must instead be lifted into
a **vision message** (`HumanMessage` with an `image_url` part), the same shape
`humanMessageFormatter` already builds for user images.

### Server side (page-action-mcp)

1. **New tool `capture_screenshot`** in `lib/tools.ts`.
   - Args: `{ full_page?: boolean, highlight?: boolean }` (default viewport, no highlight).
   - Capture via CDP: `sendCommand(tabId, "Page.captureScreenshot", { format: "png" })`
     (add a `Page.getLayoutMetrics` + clip pass for `full_page`).
   - Return an MCP `image` content block `{ type: "image", data, mimeType: "image/png" }`.
     This needs the tool handler to return content blocks directly, not just a string —
     extend `ToolDef.handler` to allow returning `{ content: [...] }`.
2. **(Optional) highlight overlay** when `highlight: true`: before capture, inject a page
   function that draws numbered boxes over every element in `window.__paMcpMap` (absolutely
   positioned divs with the index label), capture, then remove them. This lets a vision
   model map `[index]` → pixel location — this is what makes index-based clicking reliable
   for vision models.

### Consumer side (page-assist-2)

3. In `src/libs/mcp/normal-chat.ts` tool loop: after a tool returns, detect image content
   in the result. Instead of (or in addition to) the text `ToolMessage`, push a
   `HumanMessage` whose content is `[{ type: "image_url", image_url: "data:image/png;base64,..." }]`
   into `lcConversation`, then continue the loop. Reuse the `image_url` content shape from
   `humanMessageFormatter`.
4. **Capability gate**: only surface/honor screenshots when the selected model is
   vision-capable; otherwise skip the image injection (and ideally hide the tool). Mirror
   the existing `bindTools` capability check pattern.
5. **Plumbing**: `http-client.ts` `formatToolResponse` currently flattens to text — pass
   image blocks through as a structured artifact so step 3 can read them, rather than
   stringifying.

### Acceptance

- On a vision model: ask "what's on this page" → `capture_screenshot` runs → model
  describes actual visual content (not "[Image output]").
- On a non-vision model: tool is hidden/no-op, no crash.
- With `highlight: true`: screenshot shows numbered boxes aligned to `get_page_state` indices.

---

## Part 2 — High-leverage observation upgrades

Ordered by reliability impact. #1–#3 are the ones that matter most.

### 1. JS event-listener detection (biggest accuracy win)

Today `paBuildPageState` (in `lib/page-scripts.ts`) only flags interactivity via tags,
roles, `onclick` attribute, `tabindex`, contenteditable. Modern sites make bare
`<div>`/`<span>` clickable via attached JS listeners, which we miss entirely.

- Plan: for candidate elements, detect attached `click`/`mousedown`/`pointerdown`
  listeners. `getEventListeners()` is only available in the CDP/devtools context, so this
  moves detection out of plain `Runtime.evaluate` into a CDP pass:
  `DOM.getDocument` → for nodes, `DOMDebugger.getEventListeners({ objectId })`.
- Cheaper interim heuristic (no per-node CDP round-trips): also treat
  `getComputedStyle(el).cursor === "pointer"` + has bounding box as interactive. Noisier
  but catches most handler-driven elements with zero CDP cost. Ship this first, add the
  real `getEventListeners` pass behind it.

### 2. Wait-for-DOM-settle before capture

`get_page_state` runs immediately, so on a still-rendering page the element map is
incomplete/stale.

- Plan: add a settle step in `lib/cdp.ts` used before serialization — wait for
  `document.readyState === "complete"`, then a short network-quiet / mutation-quiet window
  (e.g. no DOM mutations for ~500ms, capped at ~3s). Implement via a page-injected
  `MutationObserver` promise or CDP `Page.lifecycleEvent` / `Network` idle.

### 3. Stable element ids + new-element marking

We assign a fresh sequential index every `get_page_state`; it resets each call, so
"index 7 from last step" isn't guaranteed to be the same node.

- Plan: key elements on CDP `backendNodeId` (stable across re-serializations) instead of
  array position. Keep a session map `backendNodeId ↔ shown index`, reuse the shown index
  for an element seen before, and prefix newly-appeared elements with `*` (as a hint the
  page changed). Resolve actions through the `backendNodeId`, not a positional lookup.

### 4. Occlusion / paint-order filter

We can hand the model an element hidden behind a modal/sticky header, so a click lands on
the wrong thing.

- Plan: during serialization, for each candidate use `document.elementFromPoint(cx, cy)`
  at the element center and drop it if the topmost hit isn't the element (or its
  descendant). This is the cheap version of browser-use's PaintOrderRemover and needs no
  CDP.

### 5. (Stretch) bounding-box dedup + accessibility-tree fusion

- Drop children fully contained inside an interactive parent (reduces noise: a link and
  its inner span both indexed).
- Fuse the CDP accessibility tree (`Accessibility.getFullAXTree`) for better computed
  names/roles than raw DOM attributes.

---

## Part 3 — Missing actions

Add to `lib/tools.ts` as needed:

- `upload_file` — set files on a file `<input>` (CDP `DOM.setFileInputFiles`).
- `click_at` — coordinate-based click (we're index-only today; useful as a fallback).
- `find_elements` — query by CSS selector, return matches + chosen attributes.
- `search_page` — text/regex search within page content, return matches with context.
- `find_text` — scroll to the first occurrence of given text.
- `wait` — explicit pause (pairs with #2 settle logic).
- Upgrade `extract_content` — optional `output_schema` (JSON Schema) for structured
  extraction instead of raw `innerText`.

---

## Suggested sequencing

1. **P2.1 cursor:pointer + P2.2 settle** — cheapest, biggest reliability jump, no CDP
   round-trips.
2. **P2.4 occlusion filter** — cheap, stops wrong-target clicks.
3. **P2.3 stable backendNodeId indices** — needed before multi-step reasoning is trustworthy.
4. **Part 1 screenshots** — depends on the handler returning content blocks; do after the
   element map is solid so `highlight` overlays line up.
5. **P2.1 real getEventListeners pass** — the heavier CDP version, once the rest is stable.
6. **Part 3 actions** — fill in as real tasks demand them.

## Files touched

- `lib/page-scripts.ts` — interactivity heuristics, occlusion check, highlight overlay,
  settle observer.
- `lib/cdp.ts` — settle helper, `getEventListeners`/`backendNodeId` passes, screenshot capture.
- `lib/tools.ts` — `capture_screenshot` + new actions; allow handlers to return content blocks.
- `page-assist-2/src/libs/mcp/normal-chat.ts` — lift image results into a vision `HumanMessage`.
- `page-assist-2/src/libs/mcp/http-client.ts` — stop flattening image blocks; pass them through.
