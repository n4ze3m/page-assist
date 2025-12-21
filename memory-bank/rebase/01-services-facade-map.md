# Services Façade Mapping

We keep our segmented structure and adopt upstream functionality by implementing façades.

## Mapping Table (ours <= upstream)

- src/services/features/app.ts <= src/services/app.ts
- src/services/browser/application.ts <= src/services/application.ts
- src/services/ai/ollama.ts <= src/services/ollama.ts
- src/services/features/kb.ts <= src/services/kb.ts
- src/services/ai/openai-tts.ts <= src/services/openai-tts.ts
- src/services/ai/tts.ts <= src/services/tts.ts
- src/services/ai/elevenlabs.ts <= src/services/elevenlabs.ts
- src/services/ai/model-settings.ts <= src/services/model-settings.ts
- src/services/features/search.ts <= src/services/search.ts
- src/services/browser/chrome.ts <= src/services/chrome.ts
- src/services/browser/action.ts <= src/services/action.ts
- src/services/features/title.ts: remove or wrap upstream title behavior

## Notes

- Keep our src/services/index.ts re-exports stable for callers.
- When upstream code expects flattened imports, adjust our façade exports accordingly.
- Prefer our newer OpenAI/LangChain SDKs; adapt upstream code to newer APIs where needed.

## TODOs During Implementation

- Verify all consumers compile after mapping
- Remove dead imports to deleted services
- Write minimal shims for renamed functions to avoid broad refactors
