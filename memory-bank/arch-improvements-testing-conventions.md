# Testing and Conventions Architecture

Last updated: 2026-01-16

## Summary

Extend Vitest coverage; add E2E basics; enforce patterns for reliability. Addresses progress.md testing gaps. Medium priority; estimated 1-2 hours.

## Phased Tasks

### 1. Extend Vitest Coverage

- **Description**: Add **tests**/services/ and **tests**/routes/ directories with unit tests for key modules.
- **Est. Time**: 30 minutes
- **Dependencies**: vitest.config.ts, test setup
- **Verification**: bun test passes; coverage report shows >50% for new modules.

### 2. Implement E2E Automation

- **Description**: Setup Playwright per ui-ux-chat-automation-plan.md for smoke and UX tests (e.g., submit message, toggle modes).
- **Est. Time**: 45 minutes
- **Dependencies**: ui-ux-chat-automation-plan.md
- **Verification**: npx playwright test succeeds; screenshots captured on failure.

### 3. Add Module Barrels

- **Description**: Create index.ts files in modules (hooks/, services/, routes/) for clean imports.
- **Est. Time**: 20 minutes
- **Dependencies**: All modules
- **Verification**: ESLint shows consistent import patterns; no unused imports.

### 4. Update Documentation

- **Description**: Add contributor guide to docs/ explaining shared controls/parts usage and Tailwind conventions.
- **Est. Time**: 20 minutes
- **Dependencies**: Existing docs structure
- **Verification**: Docs build successfully; guide is readable.

### 5. Holistic Quality Checks

- **Description**: Suggest adding lint/typecheck to AGENTS.md; run full suite including coverage.
- **Est. Time**: 15 minutes
- **Dependencies**: All above
- **Verification**: Coverage >50%; all lint/typecheck pass.

### 6. Document Test Matrix

- **Description**: Add test matrix table to this doc for tracking test types and coverage.
- **Est. Time**: 10 minutes
- **Dependencies**: All above
- **Verification**: Matrix is comprehensive and readable.

## Benefits

- Regression-proof codebase
- Scales with feature additions
- Aligns with progress.md quality goals

## Risks/Notes

- Mock LLM responses carefully to avoid flaky tests
- Start with unit tests before complex E2E
- May need CI configuration for Playwright

## References

- techContext.md: Vitest and testing setup
- ui-ux-chat-automation-plan.md: E2E test strategy
- progress.md: Current testing gaps
- systemPatterns.md: Quality patterns

## Status

Pending
