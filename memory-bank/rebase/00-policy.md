# Rebase Policy and Decisions

Date: 2026-01-25
Branch: improvements

## Rebase Style

- Linear rebase onto origin/main
- Safety branch: improvements-pre-rebase

## Architecture & Code Organization

- Architecture/DB/Hooks/Services: adopt upstream functionality/bugfixes; keep our folder structure (façade mapping where needed)
- UI: keep our visuals and component structure; port upstream behavioral fixes (folder mgmt, date grouping, temporary chat)
- Services: keep segmented structure under src/services/{ai,browser,features}; absorb upstream logic via façade files

## Dependencies & Config

- package.json: prefer our versions; add/upgrade only if upstream features require
- bun.lock: accept upstream then regenerate with `bun install`
- tsconfig/vitest/playwright: merge to support both suites (ours + upstream)

## Docs & Memory Bank

- Docs: prefer upstream
- Memory bank: keep ours

## Tests

- Merge test suites; adopt upstream tests that improve coverage/quality; keep ours; unify configs/mocks

## Specific Blockers Resolution

1. Remove Vision/Preset features (code and UI usage) if upstream removed
2. Services façade approach: YES
3. Title service: remove if not needed; otherwise rehome/wrap
4. SDK upgrades: keep our newer openai/langchain; adapt upstream code
5. pdf.worker: keep copy step until verified; review upstream approach and remove only if safe

## Checkpoints

- A) Services façade mapping
- B) Hooks/Modes integration (remove Vision/Preset; useMessage baseline)
- C) Dexie DB schema/migrations
- D) UI behavior port (Sidepanel/Chat/form; controls)
- E) Search provider wiring (Perplexity)
- F) Dependencies/Configs/Tests reconciliation

For each checkpoint: compile/test locally and stop for review before proceeding.
