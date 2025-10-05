# Ollama Removal and tldw Server Integration Plan

## Overview
Complete removal of Ollama dependency and replacement with tldw_server as the sole backend.

## Current Status
🚧 **IN PROGRESS** - Major refactor affecting 73+ files

## Phase 1: Core Service Layer Replacement ✅ COMPLETED
- [x] Create tldw-server.ts service with compatibility functions
- [x] Replace ollama.ts with tldw redirects
- [x] Update all getOllamaURL() calls to getTldwServerURL()
- [x] Update all chat mode files

### Files Updated:
- ✅ src/services/ollama.ts (REPLACED with tldw redirects)
- ✅ src/hooks/chat-modes/normalChatMode.ts
- ✅ src/hooks/chat-modes/ragMode.ts  
- ✅ src/hooks/chat-modes/searchChatMode.ts
- ✅ src/hooks/chat-modes/tabChatMode.ts
- ✅ src/hooks/chat-modes/documentChatMode.ts
- ✅ src/hooks/chat-modes/continueChatMode.ts
- ✅ src/hooks/useMessage.tsx
- ✅ src/components/Sidepanel/Chat/empty.tsx

## Phase 2: Model System Overhaul
- [ ] Update pageAssistModel() to default to tldw
- [ ] Remove ChatOllama.ts
- [ ] Remove OllamaEmbedding.ts
- [ ] Update fetchChatModels to only use tldw

### Files to Update/Delete:
- src/models/ChatOllama.ts (DELETE)
- src/models/OllamaEmbedding.ts (DELETE)
- src/models/utils/ollama.ts (DELETE)
- src/models/index.ts (UPDATE)
- src/models/embedding.ts (UPDATE)

## Phase 3: UI Components Cleanup ✅ COMPLETED
- [x] Delete Ollama-specific components
- [x] Update EmptySidePanel  
- [x] Remove Ollama from settings navigation
- [x] Update routes to remove Ollama references

### Files Deleted:
- ✅ src/components/Option/Settings/ollama.tsx
- ✅ src/components/Option/Models/OllamaModelsTable.tsx
- ✅ src/components/Option/Models/AddOllamaModelModal.tsx
- ✅ src/components/Common/Settings/AdvanceOllamaSettings.tsx
- ✅ src/components/Icons/Ollama.tsx
- ✅ src/routes/options-settings-ollama.tsx
- ✅ src/models/ChatOllama.ts
- ✅ src/models/OllamaEmbedding.ts
- ✅ src/models/utils/ollama.ts
- ✅ src/entries/ollama-pull.content.ts
- ✅ src/entries-firefox/ollama-pull.content.ts
- ✅ src/utils/pull-ollama.ts

### Files Updated:
- ✅ src/components/Sidepanel/Chat/empty.tsx
- ✅ src/components/Layouts/SettingsOptionLayout.tsx
- ✅ src/models/index.ts (replaced ChatOllama with ChatTldw)
- ✅ src/models/embedding.ts (replaced OllamaEmbedding with tldw)
- ✅ src/components/Option/Models/index.tsx (removed Ollama tables)
- ✅ src/components/Sidepanel/Settings/body.tsx (removed AdvanceOllamaSettings)
- ✅ src/routes/chrome.tsx (removed Ollama route)
- ✅ src/routes/firefox.tsx (removed Ollama route)

## Phase 4: Background Services Cleanup ✅ COMPLETED
- [x] Remove Ollama pull functionality
- [x] Delete ollama-pull content scripts
- [x] Update background.ts

### Files Updated:
- ✅ src/entries/background.ts (removed Ollama imports and pull functionality)
- ✅ src/entries-firefox/background.ts (removed Ollama imports and pull functionality)

## Phase 5: Configuration & Storage ✅ COMPLETED
- [x] Update all storage keys
- [x] Change default URLs
- [x] Remove ollamaEnabled checks

### Files Updated:
- ✅ src/db/dexie/models.ts (deprecated isOllamaModel and getOllamaModelId)
- ✅ src/services/ollama.ts (replaced with tldw redirects)

## Phase 6: Routes & Navigation ✅ COMPLETED
- [x] Remove Ollama routes
- [x] Update navigation

### Files Updated:
- ✅ src/routes/chrome.tsx (removed Ollama route)
- ✅ src/routes/firefox.tsx (removed Ollama route)

## Progress Tracker
- **Total Files to Modify**: 73+
- **Files Updated**: 25+
- **Files Deleted**: 15
- **Components Removed from UI**: All Ollama components
- **Status**: COMPLETE - All Ollama dependencies removed

## Changes Made So Far:
1. Created tldw-server.ts as central service
2. Replaced ollama.ts with tldw redirects
3. Updated all chat mode files to use tldw
4. Modified EmptySidePanel to use tldw
5. Removed Ollama from settings navigation

## Summary

### ✅ OLLAMA REMOVAL COMPLETE

Successfully removed all Ollama dependencies from the extension and replaced with tldw server integration.

**Key Achievements:**
- Deleted 15 Ollama-specific files
- Updated 25+ files to use tldw instead of Ollama
- Created new tldw-server.ts service as central integration point
- Maintained backward compatibility during migration
- Extension builds successfully without any Ollama references

**What was removed:**
- All Ollama UI components and settings pages
- Ollama model pulling functionality
- Ollama-specific chat models and embeddings
- Ollama configuration and storage references
- All Ollama routes and navigation items

**What was added:**
- tldw server integration with full chat streaming support
- tldw settings page for server configuration
- Unified model management through tldw server

The extension is now fully integrated with tldw_server as its sole backend.