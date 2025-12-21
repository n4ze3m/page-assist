# Dexie DB Adoption Plan

## Adopt Upstream

- Take src/db/dexie: schema.ts, chat.ts, helpers.ts, memory.ts, modelState.ts, providerState.ts
- Ensure migrations run cleanly

## Local Extensions

- If we have additional fields, add a follow-up non-breaking migration
- Document migration ID, up/down steps

## Validation

- Test: chat history date grouping, project folders, temporary chat saving
- Verify no runtime IndexedDB errors
