# Hooks & Chat-Modes Integration Plan

## Goals

- Incorporate upstream modes (continue, document, normal, rag, search, tab)
- Remove Vision/Preset modes and their UI usage (keep files unmounted if needed)
- Keep legacy useSmartScroll; optionally add useSmartScroll2 later
- Use upstream useMessage as functional baseline; rewire to our services façades

## Steps

1. During rebase conflict on useMessage.tsx, take upstream version as base
2. Update imports to our services structure
3. Remove references to visionChatMode, presetChatMode, chatWithWebsiteMode
4. Ensure UI controls set flags/params compatible with remaining modes
5. Compile and run focused tests on message flows

## Risks & Mitigations

- Removed modes referenced by UI: hide/unmount VisionToggle or translate to flags
- Event/streaming shape differences: adapt handlers (messageHandlers, messageHelpers)
