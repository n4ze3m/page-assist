# Architectural Improvements Index

Last updated: 2026-01-16

## Overview

Breakdown of src/ architecture improvements from 2026-01-16 review. Phased for incremental execution. Total estimated effort: 6-8 hours.

## Task Files

- **unify-browser.md**: Cross-browser unification (high priority, 1-2h) - Merge browser-specific routes/entries for reduced duplication; add API abstractions.
- **modularize-services.md**: Services modularization (medium priority, 2h) - Subdivide services/ for separation of concerns; add interfaces for providers.
- **enhance-routes-ui.md**: Routes and UI enhancement (high priority, 2h) - Group routes/settings; implement ChatInputShell wrappers; enforce styling conventions.
- **icons-replacement.md**: Icon replacement with CSS SVG library (medium priority, 1-2h) - Swap React icons for theme-supporting SVGs.
- **testing-conventions.md**: Testing and conventions (medium priority, 1-2h) - Extend Vitest coverage; add E2E basics; enforce patterns.

## Progress Tracker

- [x] **unify-browser.md** (High, 1-2h) - Cross-browser merge
- [x] **modularize-services.md** (Medium, 2h) - Services subdirs + interfaces
- [x] **enhance-routes-ui.md** (High, 2h) - Settings grouping + UI wrappers
- [x] **icons-replacement.md** (Medium, 1-2h) - SVG/CSS icons
- [x] **testing-conventions.md** (Medium, 1-2h) - Tests + standards

## Next Steps

Execute via opencode tasks (e.g., "Implement unify-browser tasks"). Update this file post-completion.

## References

- techContext.md: Stack and tooling details
- systemPatterns.md: Module patterns
- productContext.md: Product goals
- progress.md: Current status
