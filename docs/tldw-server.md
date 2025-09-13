# tldw_server Setup

This extension connects to your tldw_server instance — an API aggregator that unifies multiple LLM providers behind one API. The extension never talks to individual providers directly; configure them on the server and the extension discovers available models via `/api/v1/llm/models`.

## Configure the Extension

1. Open the extension Options → tldw Server
2. Set Server URL (e.g., `http://localhost:8000`)
3. Choose Authentication:
   - Single‑user: API Key header
   - Multi‑user: Login (Bearer tokens with refresh)
4. Adjust timeouts (global and per‑API) if needed
5. Click Save, then “Test Connection”

Chromium: the extension requests optional host permission for your server origin so background fetches can include auth headers and handle streaming reliably. Accept the prompt when asked.

## What the Extension Uses

- Models: `GET /api/v1/llm/models` (and optional `/models/metadata`, `/providers`)
- Chat: `POST /api/v1/chat/completions` (streaming via SSE)
- RAG: `POST /api/v1/rag/{simple|search}`
- Media: `POST /api/v1/media/{add|ingest-web-content|process-*}`
- Notes/Prompts: `GET/POST /api/v1/notes/*`, `/api/v1/prompts/*`
- STT: `POST /api/v1/audio/transcriptions` (multipart); optional realtime via WS

The background proxy injects the correct auth header for your mode and manages retries and streaming keep‑alives.

## Tips

- Use exact paths from your server (including trailing slashes where required)
- Prefer HTTPS for remote servers; HTTP is fine for localhost during development
- If connection fails, verify:
  - Options → tldw Server → Test Connection
  - The extension has permission for your server origin (Chromium)
  - No other extensions are blocking/rewriting requests
  - Server CORS is configured to allow extension fetches if needed

See also: [Connection Issues](/connection-issue)

## Screenshots (placeholders)

![Options — tldw Server Settings](./images/tldw-settings.png)

![Side Panel Chat](./images/sidepanel.png)
