# Unify Cross-Browser Architecture

Last updated: 2026-01-16

## Summary

Merge browser-specific routes/entries/hooks for reduced duplication; add API abstractions. Aligns with systemPatterns.md cross-browser patterns. High priority; estimated 1-2 hours.

## Phased Tasks

### 1. Analyze Browser Differences

- **Description**: Read and compare chrome-route.tsx, firefox-route.tsx, and entries-firefox/ vs. implied Chrome entries.
- **Est. Time**: 15 minutes
- **Dependencies**: None
- **Verification**: Manual diff notes; identify key divergences (e.g., manifest permissions, API calls).

### 2. Create Unified Entry Route

- **Description**: Merge chrome-route.tsx and firefox-route.tsx into routes/entry.tsx with runtime detection (e.g., if (chrome.runtime) {...}).
- **Est. Time**: 40 minutes
- **Dependencies**: services/chrome.ts for API abstraction
- **Verification**: TypeScript compile passes (tsc --noEmit); no import errors.

### 3. Refactor Hooks for Browser Abstraction

- **Description**: Add hooks/browser/useBrowserApi.tsx wrapper for storage/tabs APIs; integrate into existing hooks (e.g., useTabMentions.ts).
- **Est. Time**: 30 minutes
- **Dependencies**: hooks/keyboard/ and hooks/useTabMentions.ts
- **Verification**: Manual test in hook; no direct browser API calls in routes.

### 4. Update Entries for Shared Background

- **Description**: Make background.ts shared with TARGET conditionals; update WXT config for entrypointsDir.
- **Est. Time**: 15 minutes
- **Dependencies**: wxt.config.ts
- **Verification**: bun build:chrome and bun build:firefox succeed.

### 5. Cleanup and Testing

- **Description**: Remove duplicate files; run lint/typecheck.
- **Est. Time**: 10 minutes
- **Dependencies**: All above tasks
- **Verification**: git diff shows no breakage; manual open sidebar in Chrome/Firefox.

## Benefits

- Reduces code duplication by ~20%
- Easier cross-browser maintenance
- Aligns with projectbrief.md cross-browser goals

## Risks/Notes

- Browser API variances may require conditional logic
- Test in both Chrome and Firefox before finalizing

## References

- techContext.md: WXT build system details
- systemPatterns.md: Cross-browser patterns
- projectbrief.md: Cross-browser support goals

## Status

Pending
