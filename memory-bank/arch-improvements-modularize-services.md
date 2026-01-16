# Modularize Services Architecture

Last updated: 2026-01-16

## Summary

Subdivide services/ for separation of concerns; add interfaces for providers. Builds on techContext.md provider integrations. Medium priority; estimated 2 hours.

## Phased Tasks

### 1. Inventory Services

- **Description**: Categorize all services/\* files into browser/, ai/, and features/ subdirs.
- **Est. Time**: 20 minutes
- **Dependencies**: None
- **Verification**: Inventory table in doc; confirm categorization.

### 2. Create Subdirectories

- **Description**: Mkdir services/browser/, services/ai/, services/features/.
- **Est. Time**: 10 minutes
- **Dependencies**: None
- **Verification**: ls services/ shows new subdirs.

### 3. Move and Refactor Files

- **Description**: Move files to appropriate subdirs (e.g., ollama.ts → ai/, chrome.ts → browser/, kb.ts → features/). Update imports.
- **Est. Time**: 45 minutes
- **Dependencies**: All services files
- **Verification**: No import errors; tsc --noEmit passes.

### 4. Add Provider Interfaces

- **Description**: Create interfaces (e.g., ITtsProvider in ai/) to abstract providers like elevenlabs.ts and openai-tts.ts.
- **Est. Time**: 25 minutes
- **Dependencies**: tts.ts files
- **Verification**: Implement mock interface; compile passes.

### 5. Add Barrel Exports

- **Description**: Create services/index.ts to export all submodules cleanly.
- **Est. Time**: 20 minutes
- **Dependencies**: All moved files
- **Verification**: ESLint shows no unused imports; clean import paths.

### 6. Integrate with Store

- **Description**: Enhance model-settings.ts to sync with store/model.tsx via hooks.
- **Est. Time**: 25 minutes
- **Dependencies**: store/ modules
- **Verification**: State updates correctly in demo chat flow.

### 7. Final Verification

- **Description**: Run lint and typecheck; ensure no regressions.
- **Est. Time**: 15 minutes
- **Dependencies**: All above
- **Verification**: bun run lint && bun run compile succeed.

## Benefits

- Looser coupling between services
- Easier to add new providers (e.g., Whisper for speech)
- Improved maintainability and scalability

## Risks/Notes

- Avoid breaking existing TTS flows
- Test provider integrations thoroughly
- May require updates to tests

## References

- techContext.md: Provider integration details
- systemPatterns.md: Module organization
- progress.md: Recent provider consolidations

## Status

Pending
