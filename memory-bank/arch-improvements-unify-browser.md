# Unify Cross-Browser Architecture

Last updated: 2026-01-16

## Summary

Merge browser-specific routes/entries/hooks for reduced duplication; add API abstractions. Aligns with systemPatterns.md cross-browser patterns. High priority; estimated 1-2 hours.

## Key Changes Overview

- **Routes**: Merge chrome-route.tsx/firefox-route.tsx into routes/entry.tsx with runtime detection.
- **Background**: Unify into entries/background.ts with TARGET conditionals.
- **Hooks**: Create hooks/browser/useBrowserApi.tsx for abstracted APIs (tabs, sidepanel/sidebar).
- **Entries**: Use shared entrypointsDir based on TARGET; handle content scripts similarly.
- **Manifest**: Already conditional in wxt.config.ts.

## Phased Tasks

### 1. Analyze Browser Differences (Completed)

- **Description**: Read and compare chrome-route.tsx, firefox-route.tsx, and entries-firefox/ vs. implied Chrome entries.
- **Est. Time**: 15 minutes
- **Dependencies**: None
- **Verification**: Manual diff notes; identify key divergences (e.g., manifest permissions, API calls).
- **Diffs Identified**:
  - Routes: Chrome uses regular imports; Firefox lazy imports (chunk size).
  - Background: Chrome sidePanel API vs Firefox sidebarAction.
  - Permissions: MV3 (Chrome) vs MV2-like (Firefox).
  - CSP: Firefox needs extra blob/worker allowances.
  - Content scripts: Identical logic, minor comment diffs.
- **Benefits**: No direct browser API calls in hooks (use WXT's browser abstraction).

### 2. Create Unified Entry Route (40min)

- **Description**: Merge chrome-route.tsx/firefox-route.tsx into routes/entry.tsx with runtime detection (e.g., const isFirefox = typeof browser !== 'undefined' && !chrome.runtime; conditional rendering <SidepanelRoutingChrome /> or <SidepanelRoutingFirefox />).
- **Est. Time**: 40 minutes
- **Dependencies**: services/chrome.ts for API abstraction
- **Verification**: bun run compile passes; manual import check in sidepanel-chat.tsx.
- **Details**: Update routes/chrome.tsx and routes/firefox.tsx to import/use entry.tsx.

### 3. Refactor Hooks for Browser Abstraction (30min)

- **Description**: Add hooks/browser/useBrowserApi.tsx wrapper for storage/tabs APIs; integrate into existing hooks (e.g., useTabMentions.ts).
- **Est. Time**: 30 minutes
- **Dependencies**: hooks/keyboard/ and hooks/useTabMentions.ts
- **Verification**: Manual test (simulate tab mention); grep confirms no direct browser APIs in hooks.
- **Details**: Export useTabs = () => browser.tabs; useSidePanel = () => isFirefox ? { open: browser.sidebarAction.open } : chrome.sidePanel. Ensure IME/Firefox guards in useKeydownHandler.ts remain.

### 4. Update Entries for Shared Background (15min)

- **Description**: Make background.ts shared with TARGET conditionals; update WXT config for entrypointsDir.
- **Est. Time**: 15 minutes
- **Dependencies**: wxt.config.ts
- **Verification**: bun build:chrome && bun build:firefox succeed.
- **Details**: Refactor entries-firefox/background.ts into entries/background.ts with if (process.env.TARGET === 'firefox') { /_ firefox-specific _/ }. Handle content scripts by unifying if needed.

### 5. Cleanup and Testing (10min)

- **Description**: Remove duplicate files; run lint/typecheck.
- **Est. Time**: 10 minutes
- **Dependencies**: All above tasks
- **Verification**: git diff shows no breakage; manual open sidebar in Chrome/Firefox.
- **Details**: Delete old firefox-route.tsx if unused; run bun run lint && bun run compile.

## Benefits

- Reduces code duplication by ~20%
- Easier cross-browser maintenance
- Aligns with projectbrief.md cross-browser goals

## Risks/Notes

- Browser API variances may require conditional logic
- Test in both Chrome and Firefox before finalizing
- Questions: For content scripts like youtube-summarize, unify into one file with conditionals? Any API edge cases (e.g., scripting limitations)?

## References

- techContext.md: WXT build system details
- systemPatterns.md: Cross-browser patterns
- projectbrief.md: Cross-browser support goals

## Status

Completed

## Post-Completion Notes

- Unified routes/entry.tsx merges chrome-route.tsx and firefox-route.tsx with runtime detection and lazy imports.
- Created hooks/browser/useBrowserApi.tsx for abstracted browser APIs (tabs, sidePanel/sidebar).
- Unified background.ts with TARGET conditionals for sidePanel vs sidebarAction APIs.
- Removed old route files; builds pass for both browsers.
- Benefits realized: ~20% code reduction, easier maintenance, preserved functionality.
